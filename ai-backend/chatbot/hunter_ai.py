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
import sys

# DEBUGGING: Environment and path information
print("🔍 DEBUG: Starting hunter_ai.py initialization")
print(f"   Python version: {sys.version}")
print(f"   Current working directory: {Path.cwd()}")
print(f"   Script location: {Path(__file__).parent}")
print(f"   Script file: {__file__}")

# Load environment variables - same paths as original
current_dir = Path(__file__).parent
print(f"   Current dir resolved to: {current_dir}")

# Debug environment file loading
env_files = [
    current_dir / "../api/hunter_api-key.env",
    current_dir / "../api/pinecone_api-key.env"
]

print(f"🔑 DEBUG: Environment file loading")
for env_file in env_files:
    print(f"   Checking: {env_file}")
    print(f"   Exists: {env_file.exists()}")
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
        print(f"   ✅ Loaded: {env_file.name}")
    else:
        print(f"   ⚠️ Missing: {env_file.name}")

# Check environment variables
pinecone_key = os.getenv("PINECONE_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")
print(f"🔑 DEBUG: Environment variables")
print(f"   PINECONE_API_KEY: {'SET (' + pinecone_key[:10] + '...)' if pinecone_key else 'MISSING'}")
print(f"   OPENAI_API_KEY: {'SET (' + openai_key[:10] + '...)' if openai_key else 'MISSING'}")

if not pinecone_key:
    print("❌ CRITICAL: PINECONE_API_KEY is missing!")
if not openai_key:
    print("❌ CRITICAL: OPENAI_API_KEY is missing!")

class UNYCompassDatabase:
    def __init__(self, index_name="uny-compass-intermediate"):
        print(f"🔍 DEBUG: Initializing UNYCompassDatabase")
        print(f"   Index name: {index_name}")
        
        self.index_name = index_name
        self.namespace = "hunter-intermediate"
        print(f"   Namespace: {self.namespace}")
        
        # Test model loading with debugging
        try:
            print("🤖 DEBUG: Loading sentence transformer model...")
            self.model = SentenceTransformer('all-mpnet-base-v2')
            print("   ✅ Model loaded successfully")
        except Exception as e:
            print(f"   ❌ Model loading failed: {e}")
            print(f"   Exception type: {type(e)}")
            raise
        
        # Test text splitter
        try:
            print("📝 DEBUG: Initializing text splitter...")
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=800,           # Larger chunks for better context
                chunk_overlap=100,        # Overlap to maintain context between chunks
                separators=["\n\n--- PAGE:", "\n\n", "\n", ". ", " ", ""],  # Smart splitting priorities
                length_function=len
            )
            print("   ✅ Text splitter initialized")
        except Exception as e:
            print(f"   ❌ Text splitter failed: {e}")
            raise

        # Test Pinecone connection with detailed debugging
        try:
            print("🌲 DEBUG: Connecting to Pinecone...")
            if not pinecone_key:
                raise ValueError("PINECONE_API_KEY is required but not found")
                
            pc = Pinecone(api_key=pinecone_key)
            print("   ✅ Pinecone client created")
            
            # List available indexes
            try:
                indexes = [idx.name for idx in pc.list_indexes()]
                print(f"   Available indexes: {indexes}")
            except Exception as e:
                print(f"   ❌ Failed to list indexes: {e}")
                raise
            
            # Check if target index exists
            if index_name not in indexes:
                print(f"   ⚠️ Index '{index_name}' not found in available indexes")
                print(f"   Creating new index...")
                try:
                    pc.create_index(
                        name=index_name,
                        dimension=768,  # Changed from 384 to 768 for better model
                        metric="cosine",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1")
                    )
                    print(f"   ✅ Index '{index_name}' created")
                    time.sleep(10)
                except Exception as e:
                    print(f"   ❌ Index creation failed: {e}")
                    raise
            else:
                print(f"   ✅ Using existing index '{index_name}'")

            # Connect to index
            try:
                self.index = pc.Index(index_name)
                print("   ✅ Connected to index")
            except Exception as e:
                print(f"   ❌ Failed to connect to index: {e}")
                raise
                
            # Check index statistics with detailed output
            try:
                print("📊 DEBUG: Checking index statistics...")
                stats = self.index.describe_index_stats()
                print(f"   Total vectors: {stats.total_vector_count}")
                print(f"   Namespaces: {list(stats.namespaces.keys())}")
                
                if self.namespace in stats.namespaces:
                    namespace_count = stats.namespaces[self.namespace].vector_count
                    print(f"   Vectors in '{self.namespace}': {namespace_count}")
                    if namespace_count == 0:
                        print(f"   ⚠️ Namespace '{self.namespace}' is empty!")
                else:
                    print(f"   ⚠️ Namespace '{self.namespace}' not found!")
                    print(f"   Available namespaces: {list(stats.namespaces.keys())}")
                    
            except Exception as e:
                print(f"   ❌ Failed to get index stats: {e}")
                # Don't raise here, continue with initialization
                
        except Exception as e:
            print(f"❌ CRITICAL: Pinecone connection failed: {e}")
            print(f"   Exception type: {type(e)}")
            raise
        
        # Initialize file tracking
        try:
            print("📁 DEBUG: Setting up file tracking...")
            self.indexed_files_record = current_dir / "indexed_files.json"
            print(f"   Tracking file: {self.indexed_files_record}")
            print(f"   Tracking file exists: {self.indexed_files_record.exists()}")
            
            self.indexed_files = self.load_indexed_files()
            print(f"   Loaded {len(self.indexed_files)} indexed file records")
        except Exception as e:
            print(f"   ❌ File tracking setup failed: {e}")
            self.indexed_files = {}

        # Run data check with debugging
        print("🎯 DEBUG: Running data check...")
        try:
            self.check_and_update_data()
            print("✅ DEBUG: Initialization complete!")
        except Exception as e:
            print(f"❌ DEBUG: Data check failed: {e}")
            raise

    def load_indexed_files(self) -> Dict[str, str]:
        """Load record of what files have been indexed with their hashes"""
        try:
            if self.indexed_files_record.exists():
                with open(self.indexed_files_record, 'r') as f:
                    data = json.load(f)
                    print(f"   📁 Loaded tracking data for {len(data)} files")
                    return data
        except Exception as e:
            print(f"   ⚠️ Error loading indexed files record: {e}")
        return {}

    def save_indexed_files(self):
        """Save record of indexed files"""
        try:
            with open(self.indexed_files_record, 'w') as f:
                json.dump(self.indexed_files, f, indent=2)
        except Exception as e:
            print(f"⚠️ Error saving indexed files record: {e}")

    def get_file_hash(self, file_path: Path) -> str:
        """Get hash of file to detect changes"""
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()

    def check_and_update_data(self):
        """FIXED: Check vector DB first, skip file processing if data exists"""
        print("🔍 DEBUG: check_and_update_data() called")
        
        # FIRST: Check if we already have data in the vector database
        try:
            print("   Checking vector database status...")
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
                print("🔍 DEBUG: Exiting early - using existing vector data")
                return  # EXIT HERE - we have data!
            else:
                print("📁 No data in vector database, checking for local files...")
                
        except Exception as e:
            print(f"⚠️ Could not check vector database status: {e}")
            print("📁 Proceeding to check for local files...")
        
        # ONLY if no data exists, look for files to process
        docs_dir = current_dir / "../docs"
        print(f"🔍 DEBUG: Checking docs directory: {docs_dir}")
        print(f"   Docs dir exists: {docs_dir.exists()}")
        
        # Check if docs directory exists
        if not docs_dir.exists():
            print(f"❌ No vector data found and no local docs directory")
            print(f"💡 Solutions:")
            print(f"   1. Run hunter_main.py to generate local data")
            print(f"   2. Create empty docs folder to bypass this check")  
            print(f"   3. Check your Pinecone API key and index name")
            print("🔍 DEBUG: Exiting - no docs directory found")
            return
        
        # List contents of docs directory
        if docs_dir.exists():
            try:
                doc_files = list(docs_dir.glob("*"))
                print(f"   Files in docs directory: {[f.name for f in doc_files]}")
            except Exception as e:
                print(f"   Error listing docs directory: {e}")
        
        # Rest of your original file processing logic...
        possible_files = [
            docs_dir / "hunter_hybrid.txt",              
            docs_dir / "hunter_hybrid_urls.json",        
            docs_dir / "hunter_hybrid_analytics.json"    
        ]
        
        print(f"🔍 DEBUG: Checking for specific files...")
        files_to_process = []
        
        for file_path in possible_files:
            print(f"   Checking: {file_path}")
            print(f"   Exists: {file_path.exists()}")
            
            if file_path.exists():
                try:
                    current_hash = self.get_file_hash(file_path)
                    stored_hash = self.indexed_files.get(str(file_path))
                    
                    if current_hash != stored_hash:
                        files_to_process.append((file_path, current_hash))
                        print(f"   ✅ Found new/updated file: {file_path.name}")
                    else:
                        print(f"   ⏭️ File unchanged: {file_path.name}")
                except Exception as e:
                    print(f"   ❌ Error processing {file_path.name}: {e}")
        
        print(f"🔍 DEBUG: Files to process: {len(files_to_process)}")
        
        if files_to_process:
            clear_index = os.getenv("CLEAR_PINECONE_INDEX", "false").lower() == "true"
            print(f"   CLEAR_PINECONE_INDEX setting: {clear_index}")

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
                try:
                    if file_path.suffix == '.json':
                        self.upload_json_file(str(file_path), file_hash)
                    else:
                        self.upload_text_file(str(file_path), file_hash)
                except Exception as e:
                    print(f"❌ Error processing {file_path.name}: {e}")
        else:
            print("📁 No new files to process in docs directory")
            print("🔍 DEBUG: Exiting - no files need processing")

    def upload_text_file(self, file_path: str, file_hash: str = None):
        """INTERMEDIATE: Enhanced upload with better chunking and metadata"""
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
        
        # INTERMEDIATE: Parse page structure if it exists (preserves your crawl structure)
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
                        # INTERMEDIATE: Extract rich metadata from URL and content
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
        
        # INTERMEDIATE: Create embeddings with better model and upload in batches
        vectors = []
        for i, (chunk, metadata) in enumerate(chunks_with_metadata):
            try:
                embedding = self.model.encode([chunk])[0]
                
                # INTERMEDIATE: Store more text in metadata
                metadata['text'] = chunk[:8000]  # Store more text than original
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
        """ENHANCED: Process JSON files with structured Hunter data"""
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
                metadata['text'] = chunk[:8000]  # Store content in metadata
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
        """INTERMEDIATE: Extract rich metadata for better filtering and search"""
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
        
        # INTERMEDIATE: Extract degree mentions from content
        degree_patterns = ['BA', 'BS', 'MA', 'MS', 'PhD', 'MFA', 'MSW', 'MPH', 'DNP', 'DPT']
        found_degrees = [degree for degree in degree_patterns if degree in content]
        if found_degrees:
            metadata['degrees_mentioned'] = found_degrees
        
        return metadata

    def expand_query(self, query: str) -> List[str]:
        """INTERMEDIATE: Expand query with synonyms and related terms"""
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

    def search(self, query: str, top_k: int = 8) -> List[str]:
        """INTERMEDIATE: Enhanced search with query expansion and deduplication"""
        print(f"🔍 DEBUG: search() called with query: '{query}'")
        
        # INTERMEDIATE: Expand query for better results
        expanded_queries = self.expand_query(query)
        print(f"   Expanded to: {expanded_queries}")
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
                
                print(f"   Query '{expanded_query}': {len(results['matches'])} matches")
                
                # Collect results with scores
                for match in results['matches']:
                    score = match['score']
                    if score > 0.3:  # Higher threshold for better quality
                        all_results.append({
                            'text': match['metadata']['text'],
                            'score': score,
                            'metadata': match['metadata']
                        })
                        print(f"     Added result with score {score:.3f}")
                    else:
                        print(f"     Skipped result with low score {score:.3f}")
                        
            except Exception as e:
                print(f"Search error for query '{expanded_query}': {e}")
                continue
        
        print(f"   Total results above threshold: {len(all_results)}")
        
        # INTERMEDIATE: Remove duplicates and sort by score
        seen_texts = set()
        unique_results = []
        
        for result in sorted(all_results, key=lambda x: x['score'], reverse=True):
            text_hash = hashlib.md5(result['text'].encode()).hexdigest()
            if text_hash not in seen_texts:
                seen_texts.add(text_hash)
                unique_results.append(result['text'])
        
        final_results = unique_results[:top_k]
        print(f"   Returning {len(final_results)} unique results")
        
        if not final_results:
            print("   ⚠️ NO RESULTS - this will cause generic responses!")
        
        return final_results

    def debug_search(self, query: str, top_k: int = 5):
        """Debug search function to see what's being returned"""
        print(f"\n🔍 DEBUG SEARCH: '{query}'")
        print("=" * 50)
        
        try:
            expanded_queries = self.expand_query(query)
            print(f"📝 Expanded queries: {expanded_queries}")
            
            all_results = []
            
            for i, expanded_query in enumerate(expanded_queries):
                print(f"\n🔎 Testing query {i+1}: '{expanded_query}'")
                
                query_vector = self.model.encode([expanded_query])[0]
                
                results = self.index.query(
                    vector=query_vector.tolist(),
                    top_k=top_k,
                    include_metadata=True,
                    namespace=self.namespace
                )
                
                print(f"   Found {len(results['matches'])} matches")
                
                for j, match in enumerate(results['matches']):
                    score = match['score']
                    metadata = match.get('metadata', {})
                    text_preview = metadata.get('text', 'No text')[:200]
                    source = metadata.get('source_file', 'Unknown')
                    
                    print(f"   {j+1}. Score: {score:.3f} | Source: {source}")
                    print(f"      Preview: {text_preview}...")
                    
                    if score > 0.3:
                        all_results.append(match)
            
            print(f"\n📊 SUMMARY: {len(all_results)} results above threshold")
            return all_results
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []

class ConversationMemory:
    """INTERMEDIATE: Enhanced conversation memory with your original smart context tracking"""
    def __init__(self):
        print("🔍 DEBUG: Initializing ConversationMemory")
        self.user_interests = {}
        self.mentioned_programs = set()
        self.conversation_history = []
        self.user_frustrations = []
        
        # INTERMEDIATE: Enhanced context tracking
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
        
        # INTERMEDIATE: Extract enhanced context
        self.extract_enhanced_context(question, response)
        
        # Keep only last 5 exchanges like original
        if len(self.conversation_history) > 5:
            self.conversation_history.pop(0)
    
    def extract_enhanced_context(self, question: str, response: str):
        """INTERMEDIATE: Extract context clues from conversation"""
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
    def __init__(self, vector_db):
        print("🔍 DEBUG: Initializing UNYCompassBot")
        self.vector_db = vector_db
        
        try:
            print("   Initializing ChatOpenAI...")
            self.llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.8)
            print("   ✅ ChatOpenAI initialized")
        except Exception as e:
            print(f"   ❌ ChatOpenAI initialization failed: {e}")
            raise
            
        self.memory = ConversationMemory()
        print("✅ DEBUG: UNYCompassBot ready")
    
    def detect_question_type(self, question):
        """YOUR ORIGINAL excellent question categorization - UNCHANGED"""
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
        """YOUR ORIGINAL excellent exploration handling - UNCHANGED"""
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
        """YOUR ORIGINAL excellent frustration handling - UNCHANGED"""
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
        """YOUR ORIGINAL excellent specific program handling - UNCHANGED"""
        prompt = f"""The student is asking about a specific program or field at Hunter College.

Context from Hunter: {context}

Give them helpful information about the program they asked about. Include relevant details like degree types, requirements, and career paths. If you have specific URLs from the context, include them.

Student question: {question}

Be helpful and informative about the specific program they're interested in."""

        return self.llm.invoke(prompt).content
    
    def answer_question(self, question):
        """COMBINED: Your original smart prompting + intermediate RAG retrieval"""
        print(f"🔍 DEBUG: answer_question() called with: '{question}'")
        
        # INTERMEDIATE: Enhanced search with better retrieval
        chunks = self.vector_db.search(question, top_k=6)
        context = "\n\n".join(chunks) if chunks else "Limited information available."
        
        print(f"   Context length: {len(context)} characters")
        print(f"   Context preview: {context[:200]}...")
        
        # YOUR ORIGINAL: Detect what type of question this is
        question_type = self.detect_question_type(question)
        print(f"   Detected question type: {question_type}")
        
        # YOUR ORIGINAL: Route to appropriate handler
        try:
            if question_type == 'exploration':
                response = self.handle_exploration_question(question, context)
            elif question_type == 'frustration':
                response = self.handle_frustration(question, context)
            elif question_type == 'specific_program':
                response = self.handle_specific_program(question, context)
            else:
                # General response with your original approach
                conversation_context = self.memory.get_conversation_context()
                prompt = f"""You are a helpful Hunter College advisor. Answer the student's question naturally and conversationally.

{conversation_context}

Hunter College information: {context}

Student question: {question}

Be helpful, friendly, and conversational. Avoid excessive formatting."""
                
                response = self.llm.invoke(prompt).content
            
            print(f"   Response length: {len(response)} characters")
            print(f"   Response preview: {response[:200]}...")
            
        except Exception as e:
            print(f"❌ Error generating response: {e}")
            response = "I'm having trouble accessing the Hunter College information right now. Please try asking about specific programs or requirements."
        
        # Store this exchange
        self.memory.add_exchange(question, response)
        
        return response

# Helper function for backwards compatibility
def get_database():
    """Create and return a UNYCompassDatabase instance"""
    print("🔍 DEBUG: get_database() called")
    return UNYCompassDatabase()

def main():
    print("🔍 DEBUG: main() function called")
    
    # Initialize
    try:
        print("Initializing database...")
        db = UNYCompassDatabase()
        print("Initializing bot...")
        bot = UNYCompassBot(db)
        print("✅ Initialization complete!")
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        return
    
    print("Hunter College Intermediate RAG + Smart Conversational AI Ready! (Type 'quit' to exit)")
    print("Features: Advanced RAG + Your Smart Prompting + Enhanced Memory + Frustration Handling")
    
    # Add debug test on startup
    print("\n🧪 DEBUG: Running quick test...")
    try:
        test_response = bot.answer_question("What programs does Hunter College offer?")
        print(f"Test response length: {len(test_response)}")
        if "I'm having trouble accessing" in test_response:
            print("⚠️ WARNING: Getting fallback response - there may be an issue")
        else:
            print("✅ Test passed - system appears to be working")
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    while True:
        try:
            user_input = input("\nStudent: ").strip()
            
            if user_input.lower() in ['quit', 'exit']:
                print("Goodbye! Good luck with your studies!")
                break
            elif user_input.lower() == 'debug':
                # Special debug command
                test_query = input("Enter test query for debugging: ")
                db.debug_search(test_query)
                continue
            else:
                print(f"\nAdvisor: {bot.answer_question(user_input)}")
        except KeyboardInterrupt:
            break

if __name__ == "__main__":
    main()