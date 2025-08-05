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
        self.user_interests = {}
        self.mentioned_programs = set()
        self.conversation_history = []
        self.user_frustrations = []
    
    def add_exchange(self, question, response):
        self.conversation_history.append({
            'question': question,
            'response': response,
            'timestamp': time.time()
        })
        # Keep only last 5 exchanges
        if len(self.conversation_history) > 5:
            self.conversation_history.pop(0)
    
    def add_user_interest(self, category, value):
        if category not in self.user_interests:
            self.user_interests[category] = []
        self.user_interests[category].append(value)
    
    def get_conversation_context(self):
        if not self.conversation_history:
            return ""
        
        context = "Previous conversation:\n"
        for exchange in self.conversation_history[-2:]:
            context += f"Student: {exchange['question'][:80]}...\n"
            context += f"You: {exchange['response'][:100]}...\n\n"
        return context

class UNYCompassBot:
    def __init__(self, vector_db):
        self.vector_db = vector_db
        self.llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.8)
        self.memory = ConversationMemory()
    
    def detect_question_type(self, question):
        """Categorize what the user is asking about"""
        question_lower = question.lower()
        
        # Broad exploration questions
        exploration_keywords = ['help picking', 'choose major', 'what major', 'undecided', 'not sure', 'explore']
        if any(keyword in question_lower for keyword in exploration_keywords):
            return 'exploration'
        
        # Specific program questions
        if 'biology' in question_lower or 'chemistry' in question_lower or 'physics' in question_lower:
            return 'specific_program'
        
        # Frustration/complaint
        frustration_keywords = ['didn\'t ask', 'you assumed', 'why did you', 'you didn\'t', 'without asking']
        if any(keyword in question_lower for keyword in frustration_keywords):
            return 'frustration'
        
        # Requirements/logistics
        if 'requirements' in question_lower or 'credits' in question_lower or 'apply' in question_lower:
            return 'logistics'
            
        return 'general'
    
    def handle_exploration_question(self, question, context):
        """Handle broad 'help me pick a major' type questions"""
        prompt = f"""You are a helpful Hunter College academic advisor talking to a student who needs help choosing a major.

{context}

IMPORTANT: The student is asking for help exploring majors, which means:
- DO NOT immediately suggest specific programs
- Start by asking them questions to understand their interests
- Be conversational and supportive
- Ask about their interests, career goals, favorite subjects, etc.
- Only suggest specific majors AFTER you understand what they're looking for

Context from Hunter College database: {context}

Student question: {question}

Respond like a real advisor would - ask questions first, suggest programs later."""

        return self.llm.invoke(prompt).content
    
    def handle_frustration(self, question, context):
        """Handle when user is frustrated with previous responses"""
        prompt = f"""The student is frustrated with your previous responses. They feel you made assumptions or didn't listen to them properly.

Previous conversation: {self.memory.get_conversation_context()}

Context: {context}

IMPORTANT:
- Acknowledge their frustration genuinely
- Apologize for not asking questions first
- Start over with a better approach
- Ask them what they're actually interested in
- Be more conversational and less formal

Student's frustrated message: {question}

Respond with empathy and start fresh."""

        return self.llm.invoke(prompt).content
    
    def handle_specific_program(self, question, context):
        """Handle questions about specific programs"""
        prompt = f"""The student is asking about a specific program or field at Hunter College.

Context from Hunter: {context}

Give them helpful information about the program they asked about. Include relevant details like degree types, requirements, and career paths. If you have specific URLs from the context, include them.

Student question: {question}

Be helpful and informative about the specific program they're interested in."""

        return self.llm.invoke(prompt).content
    
    def answer_question(self, question):
        """Main method to answer student questions"""
        # Get relevant context from database
        chunks = self.vector_db.search(question)
        context = "\n\n".join(chunks) if chunks else "Limited information available."
        
        # Detect what type of question this is
        question_type = self.detect_question_type(question)
        
        # Route to appropriate handler
        if question_type == 'exploration':
            response = self.handle_exploration_question(question, context)
        elif question_type == 'frustration':
            response = self.handle_frustration(question, context)
        elif question_type == 'specific_program':
            response = self.handle_specific_program(question, context)
        else:
            # General response
            conversation_context = self.memory.get_conversation_context()
            prompt = f"""You are a helpful Hunter College advisor. Answer the student's question naturally and conversationally.

{conversation_context}

Hunter College information: {context}

Student question: {question}

Be helpful, friendly, and conversational. Avoid excessive formatting."""
            
            response = self.llm.invoke(prompt).content
        
        # Store this exchange
        self.memory.add_exchange(question, response)
        
        return response

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