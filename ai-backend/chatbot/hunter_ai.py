import os
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_openai import ChatOpenAI  
from dotenv import load_dotenv
import re
from pinecone import Pinecone, ServerlessSpec
import hashlib
import time
from pathlib import Path

# Load environment variables
load_dotenv(dotenv_path=Path("../api/hunter_api-key.env"))
load_dotenv(dotenv_path=Path("../api/pinecone_api-key.env"))

class UNYCompassDatabase:
    def __init__(self, index_name="uny-compass-index"):
        self.index_name = index_name
        self.namespace = "hunter-default"
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

        # Connect to Pinecone
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

        # Create index if needed
        if index_name not in [idx.name for idx in pc.list_indexes()]:
            print(f"Creating index '{index_name}'...")
            pc.create_index(
                name=index_name,
                dimension=384,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
            time.sleep(10)
        else:
            print(f"Using existing index '{index_name}'...")

        # Assign index
        self.index = pc.Index(index_name)

        # Check if we need to upload data
        stats = self.index.describe_index_stats()
        if stats.total_vector_count == 0:
            self.upload_text_file("hunter_content.txt")

    def upload_text_file(self, file_path):
        """Upload text file to Pinecone"""
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Simple chunking
        chunk_size = 500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size) if text[i:i+chunk_size].strip()]
        
        # Create vectors and upload
        vectors = []
        for i, chunk in enumerate(chunks):
            embedding = self.model.encode([chunk])[0]
            vectors.append({
                'id': f'chunk_{i}',
                'values': embedding.tolist(),
                'metadata': {'text': chunk[:1000]}
            })
            
            # Upload in batches of 100
            if len(vectors) == 100:
                self.index.upsert(vectors=vectors)  # Upload to default namespace
                vectors = []
        
        # Upload remaining
        if vectors:
            self.index.upsert(vectors=vectors)  # Upload to default namespace
        
        print(f"Upload complete: {len(chunks)} chunks")

    def search(self, query, top_k=5):
        """Search Pinecone for relevant chunks"""
        query_vector = self.model.encode([query])[0]
        results = self.index.query(
            vector=query_vector.tolist(),
            top_k=top_k,
            include_metadata=True
            # No namespace specified = search default namespace
        )
        
        return [match['metadata']['text'] for match in results['matches'] if match['score'] > 0.2]

class UNYCompassBot:
    def __init__(self, vector_db):
        self.vector_db = vector_db
        self.llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.3)
    
    def answer_question(self, question):
        chunks = self.vector_db.search(question)
        
        if not chunks:
            return "I don't have information on that topic. Please make sure the hunter_content.txt file contains the relevant information."
        
        context = "\n\n".join(chunks)
        prompt = f"""Context: {context}
        
Overview: 
You are a Hunter College academic advisor. Answer the student's question using the information provided above.
Be helpful and informative. If you can, include relevant URLs from the sources. Do not respond saying "according to Hunter sources"
Treat all information from the hunter website as factual. Only cite sources from the official Hunter College website.
Only give answers that relate to Hunter College major programs or pathways. If the user asks about general subject of programs
please list the majors that relate to that subject as well as the corresponding links.

Guidelines:
- be helpful and encouraging to students
- include specific names of programs and degree types (BA, BS, MA, etc.), and requirements if needed
- ALWAYS give relevant URLS so students can check the hunter website themself
- focus on the academic programs, majors and pathways
- if asked about specific programs (i.e. Nursing), list all related majors with the links

Ethics:
- Always answer as if giving a suggestion and not a requirement
- emphasize students have choices and can explore their interests at Hunter
- encourage them to talk to official advisors (give the advisor contact info if needed), attend info sessions, etc.

Tone:
- be encouraging
- avoid academic jargon, you are supposed to be relatable to the student
- be conversational but also professional
- be enthusiastic about Hunter programs

Question: {question}
Answer:"""
       
        response = self.llm.invoke(prompt)
        return response.content

def main():
    # Initialize
    db = UNYCompassDatabase()
    bot = UNYCompassBot(db)
    
    print("Hunter College Advisor Ready!")
    
    while True:

        try:
            user_input = input("User: ").strip()
            
            if user_input.lower() in ['quit', 'exit']:
                print("Goodbye!")
                break
                
            else:
                print("UNY Compass Chatbot:", bot.answer_question(user_input))
        except KeyboardInterrupt:
            break

        

if __name__ == "__main__":
    main()