import sys
import json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import re
import threading
import time
from functools import lru_cache

# Add the chatbot directory to Python path
chatbot_dir = Path(__file__).parent.parent / "chatbot"
sys.path.append(str(chatbot_dir))

app = Flask(__name__)

CORS(app,
     origins=[
         "http://localhost:3000",
         "https://unycompass.vercel.app"
     ],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS"])

@app.after_request
def apply_cors(response):
    origin = request.headers.get('Origin')
    if origin and re.match(r"https:\/\/.*unycompass.*\.vercel\.app", origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# CRITICAL FIX: Global singleton instances with lazy loading
_db_instance = None
_bot_instance = None
_initialization_lock = threading.Lock()
_is_initializing = False
CHATBOT_READY = False
CHATBOT_ERROR = None

def get_chatbot_instances():
    """Lazy singleton pattern - only initialize once and reuse"""
    global _db_instance, _bot_instance, _is_initializing, CHATBOT_READY, CHATBOT_ERROR
    
    if CHATBOT_READY and _db_instance and _bot_instance:
        return _db_instance, _bot_instance
    
    with _initialization_lock:
        # Double-check pattern
        if CHATBOT_READY and _db_instance and _bot_instance:
            return _db_instance, _bot_instance
            
        if _is_initializing:
            # Another thread is initializing, wait
            while _is_initializing:
                time.sleep(0.1)
            return _db_instance, _bot_instance
        
        _is_initializing = True
        
        try:
            print("🤖 Initializing Hunter College Chatbot (one-time only)...")
            start_time = time.time()
            
            # Import here to avoid circular imports
            from hunter_ai import UNYCompassDatabase, UNYCompassBot
            
            print("📚 Loading vector database...")
            _db_instance = UNYCompassDatabase()
            
            print("🧠 Loading AI model...")
            _bot_instance = UNYCompassBot(_db_instance)
            
            elapsed = time.time() - start_time
            print(f"✅ Chatbot initialized successfully in {elapsed:.2f}s!")
            
            CHATBOT_READY = True
            CHATBOT_ERROR = None
            
        except Exception as e:
            print(f"❌ Failed to initialize chatbot: {e}")
            CHATBOT_READY = False
            CHATBOT_ERROR = str(e)
            _db_instance = None
            _bot_instance = None
        finally:
            _is_initializing = False
    
    return _db_instance, _bot_instance

@lru_cache(maxsize=100)
def cached_answer(question, session_id=None):
    """Cache recent answers for identical questions"""
    db, bot = get_chatbot_instances()
    if not db or not bot:
        return None
    return bot.answer_question(question, session_id=session_id)

def ask_question_with_session(question, session_id=None):
    """Optimized question processing with caching"""
    if not question or not question.strip():
        return {"error": "Question cannot be empty"}
    
    # Check if chatbot is ready
    db, bot = get_chatbot_instances()
    if not CHATBOT_READY or not bot:
        return {"error": f"Chatbot not available: {CHATBOT_ERROR}"}
    
    try:
        # For development: use cache for identical questions
        # For production: you might want to disable this
        cache_key = f"{question.strip()[:100]}_{session_id}" if session_id else question.strip()[:100]
        
        start_time = time.time()
        answer = bot.answer_question(question.strip(), session_id=session_id)
        processing_time = time.time() - start_time
        
        print(f"⚡ Question processed in {processing_time:.2f}s")
        
        return {
            "success": True,
            "question": question,
            "answer": answer,
            "timestamp": str(datetime.now()),
            "processing_time": processing_time
        }
        
    except Exception as e:
        print(f"❌ Error processing question: {e}")
        return {"error": f"Error processing question: {str(e)}"}

# Health check
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "Hunter College Chatbot API is running",
        "chatbot_ready": CHATBOT_READY
    })

# Backward compatibility routes
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Please provide a 'message' field in your request"}), 400
    
    response = ask_question_with_session(data['message'])
    if "error" in response:
        return jsonify(response), 500
    
    return jsonify({
        "question": response["question"],
        "response": response["answer"],
        "timestamp": response["timestamp"]
    })

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "status": "ready" if CHATBOT_READY else "error",
        "chatbot_ready": CHATBOT_READY,
        "error": CHATBOT_ERROR if not CHATBOT_READY else None
    })

# Primary API routes
@app.route('/api/chatbot/status', methods=['GET', 'OPTIONS'])
def chatbot_status():
    if request.method == 'OPTIONS':
        return '', 200
    
    # Fast status check without initializing if not ready
    return jsonify({
        "status": "online" if CHATBOT_READY else "offline", 
        "pythonWorking": CHATBOT_READY,
        "message": "Hunter AI chatbot is ready" if CHATBOT_READY else f"Chatbot initializing or error: {CHATBOT_ERROR}",
        "service": "chatbot"
    })

@app.route('/api/chatbot/ask', methods=['POST', 'OPTIONS'])
def chatbot_ask():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Please provide a 'message' field in your request"}), 400
    
    message = data['message']
    session_id = data.get('session_id')
    
    print(f"🤖 Processing message for session {session_id}: {message[:50]}...")
    
    response = ask_question_with_session(message, session_id)
    
    if "error" in response:
        return jsonify(response), 500
    
    return jsonify({
        "question": response["question"],
        "response": response["answer"],
        "timestamp": response["timestamp"],
        "session_id": session_id,
        "processing_time": response.get("processing_time")
    })

# Memory management
@app.route('/api/chatbot/reset/<int:session_id>', methods=['POST'])
def reset_session_memory(session_id):
    """Reset memory for a specific session"""
    db, bot = get_chatbot_instances()
    if not CHATBOT_READY or not bot:
        return jsonify({"error": "Chatbot not available"}), 500
    
    try:
        bot.clear_session_memory(session_id)
        return jsonify({"message": f"Memory reset for session {session_id}"})
    except Exception as e:
        return jsonify({"error": f"Failed to reset session memory: {str(e)}"}), 500

# Warmup endpoint for deployment
@app.route('/api/chatbot/warmup', methods=['POST'])
def warmup():
    """Trigger chatbot initialization"""
    print("🔥 Warmup request received")
    db, bot = get_chatbot_instances()
    
    if CHATBOT_READY:
        return jsonify({"message": "Chatbot already warm", "ready": True})
    else:
        return jsonify({"message": "Chatbot warming up", "ready": False, "error": CHATBOT_ERROR})

if __name__ == '__main__':
    # Don't initialize on import - use lazy loading
    print("🚀 Flask API starting with lazy initialization...")
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)