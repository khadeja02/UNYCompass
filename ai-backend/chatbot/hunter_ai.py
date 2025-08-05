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
import requests

# Load environment variables - fix the paths
current_dir = Path(__file__).parent
load_dotenv(dotenv_path=current_dir / "../api/hunter_api-key.env")
load_dotenv(dotenv_path=current_dir / "../api/pinecone_api-key.env")

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
            # Look for hunter_content.txt in the docs directory
            content_file = current_dir / "../docs/hunter_content.txt"
            if content_file.exists():
                self.upload_text_file(str(content_file))
            else:
                print(f"Warning: {content_file} not found. Please run the web crawler first.")

    def upload_text_file(self, file_path):
        """Upload text file to Pinecone"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except FileNotFoundError:
            print(f"Error: File {file_path} not found")
            return
        
        # Simple chunking
        chunk_size = 500
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size) if text[i:i+chunk_size].strip()]
        
        if not chunks:
            print("No content to upload")
            return
        
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
                self.index.upsert(vectors=vectors)
                vectors = []
        
        # Upload remaining
        if vectors:
            self.index.upsert(vectors=vectors)
        
        print(f"Upload complete: {len(chunks)} chunks")

    def search(self, query, top_k=5):
        """Search Pinecone for relevant chunks"""
        query_vector = self.model.encode([query])[0]
        results = self.index.query(
            vector=query_vector.tolist(),
            top_k=top_k,
            include_metadata=True
        )
        
        return [match['metadata']['text'] for match in results['matches'] if match['score'] > 0.2]

class ConversationMemory:
    """Simple conversation memory to track context"""
    def __init__(self):
        self.mentioned_programs = set()
        self.broken_links = set()
        self.user_interests = []
        self.conversation_history = []
    
    def add_exchange(self, question, response):
        self.conversation_history.append({
            'question': question,
            'response': response,
            'timestamp': time.time()
        })
        # Keep only last 5 exchanges
        if len(self.conversation_history) > 5:
            self.conversation_history.pop(0)
    
    def has_mentioned_program(self, program):
        return program.lower() in [p.lower() for p in self.mentioned_programs]
    
    def add_mentioned_program(self, program):
        self.mentioned_programs.add(program)
    
    def add_broken_link(self, link):
        self.broken_links.add(link)
    
    def is_link_known_broken(self, link):
        return link in self.broken_links

def validate_url(url):
    """Check if URL is accessible"""
    try:
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code == 200
    except:
        return False

class UNYCompassBot:
    def __init__(self, vector_db):
        self.vector_db = vector_db
        self.llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.7)  # Increased temperature for more natural responses
        self.memory = ConversationMemory()
    
    def get_conversation_context(self):
        """Get recent conversation context"""
        if not self.memory.conversation_history:
            return ""
        
        context = "Recent conversation:\n"
        for exchange in self.memory.conversation_history[-3:]:  # Last 3 exchanges
            context += f"Q: {exchange['question'][:100]}...\n"
            context += f"A: {exchange['response'][:150]}...\n\n"
        
        return context
    
    def detect_frustration_indicators(self, question):
        """Detect if user is frustrated with links or repetitive responses"""
        frustration_keywords = [
            "not work", "broken", "doesn't work", "link", "same", "again", 
            "repeat", "robotic", "template", "copy paste", "generic"
        ]
        return any(keyword in question.lower() for keyword in frustration_keywords)
    
    def answer_question(self, question):
        chunks = self.vector_db.search(question)
        
        if not chunks:
            return "I don't have information on that topic. You might want to visit the Hunter College website directly or contact their admissions office at (212) 772-4490."
        
        context = "\n\n".join(chunks)
        conversation_context = self.get_conversation_context()
        
        # Check if user seems frustrated
        is_frustrated = self.detect_frustration_indicators(question)
        
        # Build dynamic prompt based on context
        if is_frustrated:
            tone_instruction = """
IMPORTANT: The user seems frustrated with previous responses. 
- Be more conversational and less formal
- Don't use excessive formatting 
- Acknowledge if you've been repetitive
- Provide direct, helpful answers
- If links were mentioned as broken, apologize and provide alternatives
"""
        else:
            tone_instruction = """
Be conversational and helpful. Respond naturally like a knowledgeable advisor would.
"""
        
        prompt = f"""You are a helpful Hunter College academic advisor chatting with a student. 

{conversation_context}

Context from Hunter College: {context}

{tone_instruction}

Guidelines:
- Answer naturally and conversationally
- Include program names and degree types when relevant
- If you mention a specific URL, make sure it's from the context provided
- If you don't have a specific URL, just say "check the Hunter College website"
- Be encouraging and supportive
- Suggest talking to official advisors when appropriate
- Don't overuse markdown formatting - keep it simple
- Focus on being helpful rather than following a template

Student's question: {question}

Response:"""
       
        response = self.llm.invoke(prompt)
        
        # Store this exchange in memory
        self.memory.add_exchange(question, response.content)
        
        return response.content

# Helper function for backwards compatibility
def get_database():
    """Create and return a UNYCompassDatabase instance"""
    return UNYCompassDatabase()

def main():
    # Initialize
    db = UNYCompassDatabase()
    bot = UNYCompassBot(db)
    
    print("Hunter College Advisor Ready! (Type 'quit' to exit)")
    
    while True:
        try:
            user_input = input("\nStudent: ").strip()
            
            if user_input.lower() in ['quit', 'exit']:
                print("Goodbye! Good luck with your studies!")
                break
                
            else:
                print(f"\nAdvisor: {bot.answer_question(user_input)}")
        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    main()