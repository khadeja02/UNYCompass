import os
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_openai import ChatOpenAI  
from dotenv import load_dotenv
import re

# Load env with absolute path
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, "..", "api", "hunter_api-key.env")
load_dotenv(dotenv_path=env_path)

class UNYCompassDatabase:
    def __init__(self, db_file=None):
        if db_file is None:
            # Use absolute path based on the current script location
            script_dir = os.path.dirname(os.path.abspath(__file__))
            db_file = os.path.join(script_dir, 'unycompass_vectors.pkl')
        
        self.db_file = db_file
        self.model = None
        self.chunks = []
        self.vectors = None
        self._cache = {}
        
        # Auto-load if exists
        if os.path.exists(self.db_file):
            self.load_database()

    def _get_model(self):
        if self.model is None:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
        return self.model

    def clean_text(self, text):
        return re.sub(r'\s+', ' ', text).strip()
    
    #  Creates vector embeddings from text
    def build_database(self, content_file=None):
        if content_file is None:
            # Use absolute path
            script_dir = os.path.dirname(os.path.abspath(__file__))
            content_file = os.path.join(script_dir, "..", "docs", "hunter_content.txt")
        
        if not os.path.exists(content_file):
            return False
        
        with open(content_file, 'r', encoding='utf-8') as f:
            content = f.read()

        pages = content.split('---- Page:')
        
        for page_idx, page in enumerate(pages):
            if len(page.strip()) < 100:
                continue

            page_text = self.clean_text(page)
            
            # Get URL
            url = ""
            for line in page_text.split('\n')[:3]:
                if "hunter.cuny.edu/" in line:
                    url = line.strip()
                    break

            # Chunk text
            words = page_text.split()
            for i in range(0, len(words), 200):
                chunk_text = ' '.join(words[i:i + 400])
                if len(chunk_text.strip()) > 50:
                    self.chunks.append({
                        'text': chunk_text,
                        'url': url,
                        'page_idx': page_idx
                    })

        # Create vectors
        model = self._get_model()
        texts = [chunk['text'] for chunk in self.chunks]
        self.vectors = model.encode(texts)
        
        # Normalize for speed
        norms = np.linalg.norm(self.vectors, axis=1, keepdims=True)
        self.vectors = self.vectors / norms

        self.save_database()
        return True
    
    # Saves database content
    def save_database(self):
        with open(self.db_file, 'wb') as f:
            pickle.dump({'chunks': self.chunks, 'vectors': self.vectors}, f)

    # Loads database with content
    def load_database(self):
        if not os.path.exists(self.db_file):
            return False
        
        try:
            with open(self.db_file, 'rb') as f:
                data = pickle.load(f)
            
            self.chunks = data['chunks']
            self.vectors = data['vectors']
            return True
        except Exception as e:
            return False
    
    # Finds relevant content using cosine similarity
    def search(self, query, top_k=2):
        if self.vectors is None:
            return []
        
        # Check cache
        if query in self._cache:
            return self._cache[query]
        
        model = self._get_model()
        query_vec = model.encode([query])
        query_vec = query_vec / np.linalg.norm(query_vec)
        
        # Fast similarity
        similarities = np.dot(query_vec, self.vectors.T)[0]
        top_idx = np.argpartition(similarities, -top_k)[-top_k:]
        top_idx = top_idx[np.argsort(similarities[top_idx])[::-1]]
        
        results = []
        for idx in top_idx:
            if similarities[idx] > 0.1:
                chunk = self.chunks[idx].copy()
                chunk['similarity'] = float(similarities[idx])
                results.append(chunk)
        
        self._cache[query] = results
        return results

class UNYCompassBot:
    def __init__(self, vector_db):
        self.vector_db = vector_db
        self.llm = ChatOpenAI(
            model='gpt-4o-mini',
            temperature=0.3,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        self._response_cache = {}
    
    # Generates AI responses
    def answer_question(self, question):
        # Check cache first
        if question in self._response_cache:
            return self._response_cache[question]
        
        chunks = self.vector_db.search(question)
        
        if not chunks:
            return "I don't have info on that. Ask about Hunter College programs."
        
        # Build context
        context = "Hunter College Info:\n\n"
        for i, chunk in enumerate(chunks, 1):
            context += f"Source {i}: {chunk['text'][:300]}\n\n"
        
        prompt = f"""{context}

You are a Hunter College academic advisor. Answer the student's question using the information provided above.
Be helpful and informative. If you can, include relevant URLs from the sources. Do not respond saying "according to Hunte sources"
Treat all information from the hunter website as factual. Only cite sources from the official Hunter College website.
Only give answers that relate to Hunter College major programs or pathways. If the user asks about general subject of programs
please list the majors that relate to that subject as well as the corresponding links.

Ethics:
Make sure it is clear that these are suggestions and that the student does not need to follow the suggestion

Question: {question}
Answer:"""
        
        try:
            response = self.llm.invoke(prompt)
            answer = response.content.strip()
            self._response_cache[question] = answer
            return answer
        except Exception as e:
            return f"Error: {e}"

# Global database
_db = None

def get_database():
    global _db
    if _db is None:
        _db = UNYCompassDatabase()
        if not _db.chunks:
            # Try to build database silently when called from API
            success = _db.build_database()
            if not success:
                return None
    return _db

def main():
    print("Starting Hunter advisor...")
    
    db = get_database()
    if not db:
        print("Database setup failed!")
        return
    
    bot = UNYCompassBot(db)
    print("Ready! Type 'quit' to exit.\n")
    
    while True:
        try:
            question = input("User: ").strip()
            
            if question.lower() in ['quit', 'exit']:
                break
            
            if question:
                print("Bot:", bot.answer_question(question))
                
        except KeyboardInterrupt:
            break
    
    print("Goodbye!")

if __name__ == "__main__":
    main()