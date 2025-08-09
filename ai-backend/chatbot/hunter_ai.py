import os
import json
import hashlib
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_openai import ChatOpenAI  
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
import re
from pinecone import Pinecone, ServerlessSpec
import time
from pathlib import Path
from typing import List, Dict, Optional
from functools import lru_cache
import threading

# Load environment variables
current_dir = Path(__file__).parent
load_dotenv(dotenv_path=current_dir / "../api/hunter_api-key.env")
load_dotenv(dotenv_path=current_dir / "../api/pinecone_api-key.env")

class UNYCompassDatabase:
    """OPTIMIZED: Singleton pattern with connection pooling and lazy loading"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, index_name="uny-compass-intermediate"):
        """Singleton pattern - reuse the same instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    print("🏗️ Creating new UNYCompassDatabase instance...")
                    cls._instance = super(UNYCompassDatabase, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, index_name="uny-compass-intermediate"):
        # Only initialize once
        if getattr(self, '_initialized', False):
            print("♻️ Reusing existing UNYCompassDatabase instance")
            return
            
        print("🚀 Initializing UNYCompassDatabase (one-time setup)...")
        start_time = time.time()
        
        self.index_name = index_name
        self.namespace = "hunter-intermediate"
        
        # OPTIMIZATION: Load model once and cache
        print("📦 Loading SentenceTransformer model...")
        model_start = time.time()
        self.model = SentenceTransformer('all-mpnet-base-v2')
        print(f"✅ Model loaded in {time.time() - model_start:.2f}s")
        
        # Smart text splitter for better chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n--- PAGE:", "\n\n", "\n", ". ", " ", ""],
            length_function=len
        )

        # OPTIMIZATION: Persistent Pinecone connection
        print("🔌 Connecting to Pinecone...")
        pinecone_start = time.time()
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        
        # Create index with new dimensions for better model
        if index_name not in [idx.name for idx in self.pc.list_indexes()]:
            print(f"🆕 Creating intermediate RAG index '{index_name}'...")
            self.pc.create_index(
                name=index_name,
                dimension=768,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
            time.sleep(10)
        else:
            print(f"Using existing intermediate index '{index_name}'...")

        self.index = self.pc.Index(index_name)
        print(f"✅ Pinecone connected in {time.time() - pinecone_start:.2f}s")
        
        # Track indexed files to handle updates
        self.indexed_files_record = current_dir / "indexed_files.json"
        self.indexed_files = self.load_indexed_files()

        # OPTIMIZATION: Quick data check - don't reprocess if data exists
        self.check_and_update_data()

        self._initialized = True
        total_time = time.time() - start_time
        print(f"🎉 UNYCompassDatabase initialized in {total_time:.2f}s")

    def load_indexed_files(self) -> Dict[str, str]:
        """Load record of what files have been indexed with their hashes"""
        if self.indexed_files_record.exists():
            with open(self.indexed_files_record, 'r') as f:
                return json.load(f)
        return {}

    def save_indexed_files(self):
        """Save record of indexed files"""
        with open(self.indexed_files_record, 'w') as f:
            json.dump(self.indexed_files, f, indent=2)

    def get_file_hash(self, file_path: Path) -> str:
        """Get hash of file to detect changes"""
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()

    def check_and_update_data(self):
        """OPTIMIZED: Check vector DB first, skip file processing if data exists"""
        
        # FIRST: Check if we already have data in the vector database
        try:
            stats = self.index.describe_index_stats()
            total_vectors = stats.total_vector_count
            namespace_vectors = 0
            
            if self.namespace in stats.namespaces:
                namespace_vectors = stats.namespaces[self.namespace].vector_count
            
            print(f"📊 Vector Database Status:")
            print(f"   Total vectors: {total_vectors}")
            print(f"   Vectors in namespace '{self.namespace}': {namespace_vectors}")
            
            # If we have data, skip file processing entirely
            if namespace_vectors > 0:
                print(f"✅ Found {namespace_vectors} vectors in database - using existing data")
                print("💡 To force reindexing, set CLEAR_PINECONE_INDEX=true")
                return  # EXIT HERE - we have data!
            else:
                print("📁 No data in vector database, checking for local files...")
                
        except Exception as e:
            print(f"⚠️ Could not check vector database status: {e}")
            print("📁 Proceeding to check for local files...")
        
        # ONLY if no data exists, look for files to process
        docs_dir = current_dir / "../docs"
        
        # Check if docs directory exists
        if not docs_dir.exists():
            print(f"❌ No vector data found and no local docs directory")
            print(f"💡 Solutions:")
            print(f"   1. Run hunter_main.py to generate local data")
            print(f"   2. Create empty docs folder to bypass this check")  
            print(f"   3. Check your Pinecone API key and index name")
            return
        
        # Rest of file processing logic
        possible_files = [
            docs_dir / "hunter_hybrid.txt",              
            docs_dir / "hunter_hybrid_urls.json",        
            docs_dir / "hunter_hybrid_analytics.json"    
        ]
        
        files_to_process = []
        
        for file_path in possible_files:
            if file_path.exists():
                current_hash = self.get_file_hash(file_path)
                stored_hash = self.indexed_files.get(str(file_path))
                
                if current_hash != stored_hash:
                    files_to_process.append((file_path, current_hash))
                    print(f"Found new/updated file: {file_path.name}")
        
        if files_to_process:
            clear_index = os.getenv("CLEAR_PINECONE_INDEX", "false").lower() == "true"

            if clear_index:
                try:
                    stats = self.index.describe_index_stats()
                    if stats.total_vector_count > 0:
                        print("CLEAR_PINECONE_INDEX=true → Deleting existing data from Pinecone index...")
                        self.index.delete(delete_all=True, namespace=self.namespace)
                        time.sleep(5)
                    else:
                        print("Index is empty, proceeding with fresh indexing...")
                except Exception as e:
                    print(f"Warning during index clearing: {e}")
            else:
                print("Skipping index deletion (set CLEAR_PINECONE_INDEX=true to enable).")

            # Process all new/updated files
            for file_path, file_hash in files_to_process:
                if file_path.suffix == '.json':
                    self.upload_json_file(str(file_path), file_hash)
                else:
                    self.upload_text_file(str(file_path), file_hash)
        else:
            print("📁 No new files to process in docs directory")

    def upload_text_file(self, file_path: str, file_hash: str = None):
        """Enhanced upload with better chunking and metadata"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        except FileNotFoundError:
            print(f"Error: File {file_path} not found")
            return
        
        if not text.strip():
            print("No content to upload")
            return

        print(f"Processing {Path(file_path).name} with intermediate RAG...")
        
        # Parse page structure if it exists
        chunks_with_metadata = []
        
        if "--- PAGE:" in text:
            # Split by pages first to preserve page boundaries
            pages = text.split("--- PAGE:")
            
            for i, page in enumerate(pages[1:], 1):  # Skip first empty part
                lines = page.strip().split('\n', 1)  # Split on first newline only
                
                if len(lines) >= 2:
                    url_line = lines[0].strip().replace('---', '').strip()
                    page_content = lines[1].strip()
                    
                    if page_content:
                        # Extract rich metadata from URL and content
                        metadata = self.extract_metadata(url_line, page_content)
                        
                        # Use smart text splitter on each page
                        page_chunks = self.text_splitter.split_text(page_content)
                        
                        for j, chunk in enumerate(page_chunks):
                            if chunk.strip():
                                chunk_metadata = metadata.copy()
                                chunk_metadata.update({
                                    'chunk_id': f"page_{i}_chunk_{j}",
                                    'page_number': i,
                                    'chunk_number': j,
                                    'source_file': Path(file_path).name
                                })
                                
                                chunks_with_metadata.append((chunk, chunk_metadata))
        else:
            # Single document - split normally
            chunks = self.text_splitter.split_text(text)
            for i, chunk in enumerate(chunks):
                if chunk.strip():
                    metadata = {
                        'chunk_id': f"doc_chunk_{i}",
                        'chunk_number': i,
                        'source_file': Path(file_path).name,
                        'content_type': 'general'
                    }
                    chunks_with_metadata.append((chunk, metadata))
        
        if not chunks_with_metadata:
            print("No chunks created")
            return
        
        # Create embeddings with better model and upload in batches
        vectors = []
        for i, (chunk, metadata) in enumerate(chunks_with_metadata):
            try:
                embedding = self.model.encode([chunk])[0]
                
                # Store more text in metadata
                metadata['text'] = chunk[:8000]
                metadata['text_length'] = len(chunk)
                
                vectors.append({
                    'id': f'{Path(file_path).stem}_{i}',
                    'values': embedding.tolist(),
                    'metadata': metadata
                })
                
                # Upload in smaller batches for stability
                if len(vectors) == 50:
                    self.index.upsert(vectors=vectors, namespace=self.namespace)
                    vectors = []
                    print(f"Uploaded batch, processed {i+1} chunks...")
                    
            except Exception as e:
                print(f"Error processing chunk {i}: {e}")
                continue
        
        # Upload remaining vectors
        if vectors:
            self.index.upsert(vectors=vectors, namespace=self.namespace)
        
        # Record this file as indexed with its hash
        if file_hash:
            self.indexed_files[file_path] = file_hash
            self.save_indexed_files()
        
        print(f"Upload complete: {len(chunks_with_metadata)} chunks from {Path(file_path).name}")

    def upload_json_file(self, file_path: str, file_hash: str = None):
        """Process JSON files with structured Hunter data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error reading JSON file {file_path}: {e}")
            return
        
        print(f"Processing JSON file: {Path(file_path).name}")
        
        chunks_with_metadata = []
        
        # Process URL mapping files (hunter_hybrid_urls.json, etc.)
        if 'schools' in data and 'departments' in data:
            print("Processing URL mapping file...")
            
            # Process schools
            for school_name, school_url in data.get('schools', {}).items():
                content = f"School: {school_name}\nURL: {school_url}\nType: Academic School"
                metadata = {
                    'content_type': 'school_info',
                    'school': school_name,
                    'url': school_url,
                    'data_type': 'url_mapping',
                    'source_file': Path(file_path).name
                }
                chunks_with_metadata.append((content, metadata))
            
            # Process departments  
            for dept_name, dept_url in data.get('departments', {}).items():
                content = f"Department: {dept_name}\nURL: {dept_url}\nType: Academic Department"
                metadata = {
                    'content_type': 'department_info',
                    'department': dept_name,
                    'url': dept_url,
                    'data_type': 'url_mapping',
                    'source_file': Path(file_path).name
                }
                chunks_with_metadata.append((content, metadata))
            
            # Process programs
            for program_name, program_url in data.get('programs', {}).items():
                content = f"Program: {program_name}\nURL: {program_url}\nType: Academic Program"
                metadata = {
                    'content_type': 'program_info',
                    'program': program_name,
                    'url': program_url,
                    'data_type': 'url_mapping',
                    'source_file': Path(file_path).name
                }
                chunks_with_metadata.append((content, metadata))
        
        # Process analytics files (hunter_hybrid_analytics.json, etc.)
        elif 'pages_data' in data:
            print("Processing analytics file...")
            
            for page_data in data.get('pages_data', []):
                # Create rich content from page metadata
                content_parts = []
                
                if page_data.get('title'):
                    content_parts.append(f"Page Title: {page_data['title']}")
                
                if page_data.get('url'):
                    content_parts.append(f"URL: {page_data['url']}")
                
                if page_data.get('programs'):
                    programs_text = ', '.join(page_data['programs'])
                    content_parts.append(f"Programs: {programs_text}")
                
                if page_data.get('degrees'):
                    degrees_text = ', '.join(page_data['degrees'])
                    content_parts.append(f"Degrees: {degrees_text}")
                
                if page_data.get('departments'):
                    depts_text = ', '.join(page_data['departments'])
                    content_parts.append(f"Departments: {depts_text}")
                
                if page_data.get('schools'):
                    schools_text = ', '.join(page_data['schools'])
                    content_parts.append(f"Schools: {schools_text}")
                
                if page_data.get('categories'):
                    categories_text = ', '.join(page_data['categories'])
                    content_parts.append(f"Categories: {categories_text}")
                
                content = '\n'.join(content_parts)
                
                if content.strip():
                    metadata = {
                        'content_type': 'page_metadata',
                        'url': page_data.get('url', ''),
                        'title': page_data.get('title', ''),
                        'data_type': 'analytics',
                        'source_file': Path(file_path).name
                    }
                    
                    # Add structured data to metadata
                    if page_data.get('programs'):
                        metadata['programs_mentioned'] = page_data['programs']
                    if page_data.get('degrees'):
                        metadata['degrees_mentioned'] = page_data['degrees']
                    if page_data.get('departments'):
                        metadata['departments_mentioned'] = page_data['departments']
                    
                    chunks_with_metadata.append((content, metadata))
        
        # Process crawl metadata
        elif 'crawl_metadata' in data:
            print("Processing crawl metadata...")
            
            crawl_info = data.get('crawl_metadata', {})
            findings = data.get('findings', {})
            
            content_parts = [
                f"Crawl Information:",
                f"Total pages crawled: {crawl_info.get('total_pages_crawled', 'Unknown')}",
                f"Content length: {crawl_info.get('total_content_length', 'Unknown')} characters",
                f"Schools discovered: {findings.get('schools_discovered', 'Unknown')}",
                f"Departments discovered: {findings.get('departments_discovered', 'Unknown')}",
                f"Programs discovered: {findings.get('programs_discovered', 'Unknown')}"
            ]
            
            content = '\n'.join(content_parts)
            metadata = {
                'content_type': 'crawl_metadata',
                'data_type': 'system_info',
                'source_file': Path(file_path).name
            }
            
            chunks_with_metadata.append((content, metadata))
        
        if not chunks_with_metadata:
            print(f"No processable data found in {Path(file_path).name}")
            return
        
        # Create embeddings and upload
        vectors = []
        for i, (chunk, metadata) in enumerate(chunks_with_metadata):
            try:
                embedding = self.model.encode([chunk])[0]
                
                # Store the content and metadata
                metadata['text'] = chunk[:8000]
                metadata['text_length'] = len(chunk)
                
                vectors.append({
                    'id': f'{Path(file_path).stem}_json_{i}',
                    'values': embedding.tolist(),
                    'metadata': metadata
                })
                
                # Upload in batches
                if len(vectors) == 50:
                    self.index.upsert(vectors=vectors, namespace=self.namespace)
                    vectors = []
                    print(f"Uploaded JSON batch, processed {i+1} items...")
                    
            except Exception as e:
                print(f"Error processing JSON chunk {i}: {e}")
                continue
        
        # Upload remaining vectors
        if vectors:
            self.index.upsert(vectors=vectors, namespace=self.namespace)
        
        # Record this file as processed
        if file_hash:
            self.indexed_files[file_path] = file_hash
            self.save_indexed_files()
        
        print(f"JSON upload complete: {len(chunks_with_metadata)} items from {Path(file_path).name}")

    def extract_metadata(self, url: str, content: str) -> Dict:
        """Extract rich metadata for better filtering and search"""
        metadata = {
            'url': url if url.startswith('http') else '',
            'content_type': 'unknown'
        }
        
        # Extract school information from URL
        if '/artsci/' in url:
            metadata['school'] = 'Arts and Sciences'
            
            # Extract specific department from URL patterns
            dept_patterns = {
                'biological-sciences': 'Biology',
                'computer-science': 'Computer Science',
                'chemistry': 'Chemistry',
                'psychology': 'Psychology',
                'economics': 'Economics',
                'sociology': 'Sociology',
                'anthropology': 'Anthropology',
                'english': 'English',
                'history': 'History',
                'philosophy': 'Philosophy',
                'political-science': 'Political Science',
                'mathematics-statistics': 'Mathematics',
                'physics-astronomy': 'Physics',
                'art-art-history': 'Art',
                'music': 'Music',
                'theatre': 'Theatre',
                'dance': 'Dance'
            }
            
            for pattern, dept in dept_patterns.items():
                if pattern in url:
                    metadata['department'] = dept
                    break
                    
        elif 'school-of-education' in url:
            metadata['school'] = 'Education'
        elif 'school-of-health-professions' in url:
            metadata['school'] = 'Health Professions'
        elif 'nursing' in url:
            metadata['school'] = 'Nursing'
        elif 'social-work' in url:
            metadata['school'] = 'Social Work'
        
        # Extract program level from URL and content
        if any(term in url for term in ['undergraduate', 'bachelor', 'ba-', 'bs-']):
            metadata['level'] = 'undergraduate'
        elif any(term in url for term in ['graduate', 'master', 'ma-', 'ms-', 'phd', 'doctoral']):
            metadata['level'] = 'graduate'
        
        # Extract content type from URL
        if 'admission' in url:
            metadata['content_type'] = 'admissions'
        elif any(term in url for term in ['faculty', 'staff']):
            metadata['content_type'] = 'faculty'
        elif 'course' in url:
            metadata['content_type'] = 'courses'
        elif 'research' in url:
            metadata['content_type'] = 'research'
        elif any(term in url for term in ['undergraduate', 'graduate', 'program']):
            metadata['content_type'] = 'program_info'
        
        # Extract degree mentions from content
        degree_patterns = ['BA', 'BS', 'MA', 'MS', 'PhD', 'MFA', 'MSW', 'MPH', 'DNP', 'DPT']
        found_degrees = [degree for degree in degree_patterns if degree in content]
        if found_degrees:
            metadata['degrees_mentioned'] = found_degrees
        
        return metadata

    def expand_query(self, query: str) -> List[str]:
        """Expand query with synonyms and related terms"""
        query_lower = query.lower()
        expanded_queries = [query]  # Always include original
        
        # Academic synonyms that improve search
        subject_synonyms = {
            'major': ['program', 'degree', 'field of study', 'concentration'],
            'program': ['major', 'degree', 'field', 'concentration'],
            'course': ['class', 'subject', 'curriculum'],
            'requirement': ['prerequisite', 'needed', 'required', 'must take'],
            'biology': ['biological sciences', 'life sciences', 'bio'],
            'computer science': ['cs', 'computing', 'programming'],
            'psychology': ['psych', 'behavioral science'],
            'mathematics': ['math', 'statistics', 'calculus'],
            'economics': ['econ', 'economic'],
            'chemistry': ['chem', 'chemical'],
            'english': ['literature', 'writing'],
            'history': ['historical'],
            'sociology': ['social'],
            'anthropology': ['cultural']
        }
        
        # Add synonyms to expand search
        for term, synonyms in subject_synonyms.items():
            if term in query_lower:
                for synonym in synonyms[:2]:  # Limit to prevent too many searches
                    expanded_queries.append(query_lower.replace(term, synonym))
        
        return expanded_queries[:3]  # Limit total queries

    @lru_cache(maxsize=500)  # Cache recent searches
    def search(self, query: str, top_k: int = 8) -> List[str]:
        """OPTIMIZED: Enhanced search with query expansion and deduplication"""
        
        # Expand query for better results
        expanded_queries = self.expand_query(query)
        all_results = []
        
        for expanded_query in expanded_queries:
            try:
                query_vector = self.model.encode([expanded_query])[0]
                
                results = self.index.query(
                    vector=query_vector.tolist(),
                    top_k=top_k,
                    include_metadata=True,
                    namespace=self.namespace
                )
                
                # Collect results with scores
                for match in results['matches']:
                    if match['score'] > 0.3:  # Higher threshold for better quality
                        all_results.append({
                            'text': match['metadata']['text'],
                            'score': match['score'],
                            'metadata': match['metadata']
                        })
                        
            except Exception as e:
                print(f"Search error for query '{expanded_query}': {e}")
                continue
        
        # Remove duplicates and sort by score
        seen_texts = set()
        unique_results = []
        
        for result in sorted(all_results, key=lambda x: x['score'], reverse=True):
            text_hash = hashlib.md5(result['text'].encode()).hexdigest()
            if text_hash not in seen_texts:
                seen_texts.add(text_hash)
                unique_results.append(result['text'])
        
        return unique_results[:top_k]

class ConversationMemory:
    """Enhanced conversation memory with context tracking"""
    def __init__(self):
        self.user_interests = {}
        self.mentioned_programs = set()
        self.conversation_history = []
        self.user_frustrations = []
        
        # Enhanced context tracking
        self.user_context = {
            'current_school': None,
            'current_department': None,
            'current_level': None,
            'interests': [],
            'interaction_pattern': 'initial'  # initial, exploring, focused, frustrated
        }
    
    def add_exchange(self, question, response):
        self.conversation_history.append({
            'question': question,
            'response': response,
            'timestamp': time.time()
        })
        
        # Extract enhanced context
        self.extract_enhanced_context(question, response)
        
        # Keep only last 5 exchanges
        if len(self.conversation_history) > 5:
            self.conversation_history.pop(0)
    
    def extract_enhanced_context(self, question: str, response: str):
        """Extract context clues from conversation"""
        question_lower = question.lower()
        
        # Extract school mentions with more patterns
        school_patterns = {
            'Arts and Sciences': ['artsci', 'liberal arts', 'sciences', 'arts and sciences'],
            'Education': ['teaching', 'education', 'educator', 'school of education'],
            'Health Professions': ['health', 'therapy', 'nutrition', 'health professions'],
            'Nursing': ['nurse', 'nursing', 'healthcare', 'bellevue'],
            'Social Work': ['social work', 'social worker', 'silberman']
        }
        
        for school, patterns in school_patterns.items():
            if any(pattern in question_lower for pattern in patterns):
                self.user_context['current_school'] = school
        
        # Extract department mentions with comprehensive patterns  
        dept_patterns = {
            'Biology': ['biology', 'bio', 'life sciences', 'biological'],
            'Chemistry': ['chemistry', 'chem', 'chemical'],
            'Psychology': ['psychology', 'psych', 'behavioral'],
            'Computer Science': ['computer science', 'cs', 'programming', 'coding', 'computing'],
            'English': ['english', 'literature', 'writing'],
            'Economics': ['economics', 'econ', 'business'],
            'Mathematics': ['math', 'mathematics', 'statistics', 'calculus'],
            'Physics': ['physics', 'physical'],
            'History': ['history', 'historical'],
            'Sociology': ['sociology', 'social'],
            'Anthropology': ['anthropology', 'cultural'],
            'Philosophy': ['philosophy', 'philosophical']
        }
        
        for dept, patterns in dept_patterns.items():
            if any(pattern in question_lower for pattern in patterns):
                self.user_context['current_department'] = dept
        
        # Extract level mentions
        if any(term in question_lower for term in ['undergraduate', 'bachelor', 'ba', 'bs']):
            self.user_context['current_level'] = 'undergraduate'
        elif any(term in question_lower for term in ['graduate', 'master', 'ma', 'ms', 'phd', 'doctoral']):
            self.user_context['current_level'] = 'graduate'
        
        # Detect interaction pattern
        frustration_keywords = ['didn\'t ask', 'you assumed', 'why did you', 'without asking']
        if any(keyword in question_lower for keyword in frustration_keywords):
            self.user_context['interaction_pattern'] = 'frustrated'
        elif any(keyword in question_lower for keyword in ['help picking', 'not sure', 'undecided']):
            self.user_context['interaction_pattern'] = 'exploring'
        elif self.user_context['current_department']:
            self.user_context['interaction_pattern'] = 'focused'
    
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
        
        # Add enhanced context information
        if self.user_context['current_department']:
            context += f"Student is interested in: {self.user_context['current_department']}\n"
        if self.user_context['current_level']:
            context += f"Student is looking at: {self.user_context['current_level']} programs\n"
        if self.user_context['interaction_pattern'] == 'frustrated':
            context += "Student seemed frustrated in recent exchange\n"
        
        return context

class UNYCompassBot:
    """OPTIMIZED: Bot with session management and persistent connections"""
    
    def __init__(self, vector_db):
        print("🤖 Initializing UNYCompassBot...")
        self.vector_db = vector_db
        
        # OPTIMIZATION: Reuse OpenAI client connection
        self.llm = ChatOpenAI(
            model='gpt-4o-mini', 
            temperature=0.8,
            max_retries=2,  # Faster failure
            request_timeout=30  # 30s timeout instead of default 60s
        )
        
        # Store multiple memories by session ID
        self.session_memories = {}  # Dictionary: {session_id: ConversationMemory}
        print("✅ UNYCompassBot ready!")
    
    def get_memory_for_session(self, session_id):
        """Get or create conversation memory for a specific session"""
        if session_id not in self.session_memories:
            print(f"🆕 Creating new conversation memory for session {session_id}")
            self.session_memories[session_id] = ConversationMemory()
        return self.session_memories[session_id]
    
    def clear_session_memory(self, session_id):
        """Clear memory for a specific session"""
        if session_id in self.session_memories:
            del self.session_memories[session_id]
            print(f"🗑️ Cleared conversation memory for session {session_id}")
    
    @lru_cache(maxsize=100)  # Cache recent question types
    def detect_question_type(self, question):
        """Enhanced question categorization that distinguishes direct questions from exploration requests"""
        question_lower = question.lower()
        
        # FIRST: Check for direct informational questions (these should get direct answers)
        direct_info_keywords = [
            'what majors', 'what programs', 'list majors', 'available majors',
            'what degrees', 'majors offered', 'programs offered', 'what can i study',
            'majors available', 'programs available', 'degree options'
        ]
        if any(keyword in question_lower for keyword in direct_info_keywords):
            return 'direct_info'  # New category for direct informational questions
        
        # THEN: Check for personal exploration (these get the "ask questions first" treatment)
        personal_exploration_keywords = [
            'help me pick', 'help me choose', 'help choosing', 'help picking',
            'i\'m undecided', 'not sure what', 'don\'t know what',
            'need help deciding', 'can\'t decide', 'help me decide'
        ]
        if any(keyword in question_lower for keyword in personal_exploration_keywords):
            return 'exploration'
        
        # Specific program questions
        if any(program in question_lower for program in ['biology', 'chemistry', 'physics', 'psychology', 'computer science', 'nursing', 'education']):
            return 'specific_program'
        
        # Frustration/complaint
        frustration_keywords = ['didn\'t ask', 'you assumed', 'why did you', 'you didn\'t', 'without asking']
        if any(keyword in question_lower for keyword in frustration_keywords):
            return 'frustration'
        
        # Requirements/logistics
        if any(keyword in question_lower for keyword in ['requirements', 'credits', 'apply', 'admission', 'prerequisites']):
            return 'logistics'
            
        return 'general'

    def handle_direct_info(self, question, context, memory):
        """Handle direct informational questions with comprehensive answers"""
        conversation_context = memory.get_conversation_context()
        
        prompt = f"""You are a Hunter College academic advisor. The student is asking a direct informational question about majors/programs available at Hunter College.

{conversation_context}

Hunter College information from database: {context}

IMPORTANT: 
- Give them a comprehensive, well-organized answer about Hunter's majors and programs
- Organize by schools/colleges (Arts & Sciences, Education, Health Professions, Nursing, Social Work)
- Include both undergraduate and graduate options
- Be informative and helpful
- You can ask a follow-up question at the END about their interests, but FIRST answer their question fully

Student's question: {question}

Provide a thorough, organized response about Hunter College's academic offerings."""

        return self.llm.invoke(prompt).content

    def handle_exploration_question(self, question, context, memory):
        """Handle exploration questions - ask questions to understand their interests first"""
        conversation_context = memory.get_conversation_context()
        
        prompt = f"""You are a Hunter College advisor helping a student who needs help choosing a major. They are asking for guidance in making this important decision.

{conversation_context}

Hunter College information: {context}

IMPORTANT APPROACH:
- Don't immediately list majors or make assumptions about what they want
- Ask thoughtful questions to understand their interests, strengths, and goals first
- Be warm, supportive, and conversational
- Focus on understanding THEM before suggesting programs
- Ask about things like: what subjects they enjoy, career goals, strengths, interests, etc.
- Keep it natural and not like a formal questionnaire

Student's question: {question}

Help them explore their interests and goals before suggesting specific majors."""

        return self.llm.invoke(prompt).content

    def handle_frustration(self, question, context, memory):
        """Handle frustrated responses - acknowledge and redirect constructively"""
        conversation_context = memory.get_conversation_context()
        
        prompt = f"""You are a Hunter College advisor. The student seems frustrated with your previous response, possibly because you made assumptions or didn't address what they actually asked.

{conversation_context}

Hunter College information: {context}

IMPORTANT:
- Acknowledge their frustration briefly and sincerely 
- Don't be defensive
- Redirect to actually answering what they're asking for
- Be more direct and helpful this time
- Focus on giving them what they need

Student's frustrated response: {question}

Respond with understanding and then provide what they're actually looking for."""

        return self.llm.invoke(prompt).content

    def handle_specific_program(self, question, context, memory):
        """Handle questions about specific programs/majors"""
        conversation_context = memory.get_conversation_context()
        
        prompt = f"""You are a Hunter College advisor. The student is asking about a specific program or major at Hunter College.

{conversation_context}

Hunter College information: {context}

IMPORTANT:
- Provide detailed, helpful information about the specific program they're asking about
- Include information about requirements, courses, career paths, etc. if available
- Be comprehensive but conversational
- If you don't have complete information, acknowledge that and suggest they contact the department
- You can ask follow-up questions about their specific interests within that field

Student's question: {question}

Provide detailed information about the specific program they're interested in."""

        return self.llm.invoke(prompt).content

    def handle_general_question(self, question, context, memory):
        """Handle general questions"""
        conversation_context = memory.get_conversation_context()
        
        prompt = f"""You are a helpful Hunter College advisor.

{conversation_context}

Hunter College information: {context}

Student question: {question}

Be helpful, friendly, and conversational. Avoid excessive formatting."""

        return self.llm.invoke(prompt).content

    def answer_question(self, question, session_id=None):
        """Updated to use session-specific memory with timing"""
        start_time = time.time()
        
        # Get session-specific memory
        if session_id:
            memory = self.get_memory_for_session(session_id)
        else:
            # Fallback for backward compatibility
            memory = ConversationMemory()
        
        # Enhanced search with better retrieval
        search_start = time.time()
        chunks = self.vector_db.search(question, top_k=8)
        search_time = time.time() - search_start
        
        context = "\n\n".join(chunks) if chunks else "Limited information available."
        
        # Detect what type of question this is
        question_type = self.detect_question_type(question)
        
        # Route to appropriate handler with session-specific memory
        llm_start = time.time()
        
        if question_type == 'direct_info':
            response = self.handle_direct_info(question, context, memory)
        elif question_type == 'exploration':
            response = self.handle_exploration_question(question, context, memory)
        elif question_type == 'frustration':
            response = self.handle_frustration(question, context, memory)
        elif question_type == 'specific_program':
            response = self.handle_specific_program(question, context, memory)
        else:
            # General response with session memory
            response = self.handle_general_question(question, context, memory)
        
        llm_time = time.time() - llm_start
        total_time = time.time() - start_time
        
        print(f"⚡ Answer generated - Search: {search_time:.2f}s, LLM: {llm_time:.2f}s, Total: {total_time:.2f}s")
        
        # Store this exchange in session-specific memory
        memory.add_exchange(question, response)
        
        return response

# Helper function for backwards compatibility
def get_database():
    """Create and return a UNYCompassDatabase instance (optimized with singleton)"""
    return UNYCompassDatabase()

def main():
    """Test the optimized system"""
    print("🚀 Testing Hunter College Optimized RAG + Smart Conversational AI...")
    
    # Initialize with optimized singleton pattern
    db = get_database()
    bot = UNYCompassBot(db)
    
    print("✅ Hunter College Intermediate RAG + Smart Conversational AI Ready! (Type 'quit' to exit)")
    print("🎯 Features: Optimized Performance + Advanced RAG + Smart Prompting + Enhanced Memory + Frustration Handling")
    
    while True:
        try:
            user_input = input("\nStudent: ").strip()
            
            if user_input.lower() in ['quit', 'exit']:
                print("Goodbye! Good luck with your studies!")
                break
                
            start_time = time.time()
            response = bot.answer_question(user_input)
            response_time = time.time() - start_time
            
            print(f"\nAdvisor: {response}")
            print(f"[Response time: {response_time:.2f}s]")
            
        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    main()