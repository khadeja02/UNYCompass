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

try:
    # Import directly from hunter_ai module (not chatbot.hunter_ai)
    from hunter_ai import UNYCompassDatabase, UNYCompassBot
except ImportError as e:
    print(json.dumps({"error": f"Failed to import hunter_ai: {e}"}))
    sys.exit(1)

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

# 🚀 FIXED: Initialize the chatbot ONCE when the server starts (like your old working version)
print("🤖 Initializing Hunter College Chatbot at startup...")
try:
    start_time = time.time()
    db = UNYCompassDatabase()
    bot = UNYCompassBot(db)
    initialization_time = time.time() - start_time
    print(f"✅ Chatbot initialized successfully in {initialization_time:.2f}s!")
    CHATBOT_READY = True
    CHATBOT_ERROR = None
except Exception as e:
    print(f"❌ Failed to initialize chatbot: {e}")
    CHATBOT_READY = False
    CHATBOT_ERROR = str(e)
    bot = None
    db = None

def ask_question_with_session(question, session_id=None):
    """Ask a question to the chatbot with session-specific memory"""
    if not CHATBOT_READY:
        return {"error": f"Chatbot not available: {CHATBOT_ERROR}"}
    
    if not question or not question.strip():
        return {"error": "Question cannot be empty"}
    
    try:
        start_time = time.time()
        # Use the SAME bot instance for all requests - with session ID for proper memory isolation
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

# Flask API Routes - Root routes for backward compatibility
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "Hunter College Chatbot API is running",
        "chatbot_ready": CHATBOT_READY,
        "initialization_time": f"{initialization_time:.2f}s" if CHATBOT_READY else None
    })

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

# Primary routes with /api/chatbot prefix to match frontend expectations
@app.route('/api/chatbot/status', methods=['GET', 'OPTIONS'])
def chatbot_status():
    if request.method == 'OPTIONS':
        return '', 200
    
    # Return format that frontend expects
    return jsonify({
        "status": "online" if CHATBOT_READY else "error", 
        "pythonWorking": CHATBOT_READY,
        "message": "Hunter AI chatbot is ready" if CHATBOT_READY else f"Chatbot error: {CHATBOT_ERROR}",
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
    ui_session_id = data.get('ui_session_id')  # For logging only
    
    print(f"🤖 Received message for UI session {ui_session_id}: {message[:50]}...")
    
    # ✅ Call without session_id - same as terminal behavior
    response = ask_question_with_session(message, session_id=None)
    
    if "error" in response:
        return jsonify(response), 500
    
    return jsonify({
        "question": response["question"],
        "response": response["answer"],
        "timestamp": response["timestamp"],
        "ui_session_id": ui_session_id,  # Return for frontend tracking
        "processing_time": response.get("processing_time")
    })

# Optional: Reset conversation memory endpoint
@app.route('/api/chatbot/reset/<int:session_id>', methods=['POST'])
def reset_session_memory(session_id):
    """Reset memory for a specific session"""
    if not CHATBOT_READY:
        return jsonify({"error": "Chatbot not available"}), 500
    
    try:
        bot.clear_session_memory(session_id)
        return jsonify({"message": f"Memory reset for session {session_id}"})
    except Exception as e:
        return jsonify({"error": f"Failed to reset session memory: {str(e)}"}), 500

# Warmup endpoint (now just returns status since we init at startup)
@app.route('/api/chatbot/warmup', methods=['POST'])
def warmup():
    """Chatbot is already warm since we initialize at startup"""
    return jsonify({
        "message": "Chatbot already warm (initialized at startup)",
        "ready": CHATBOT_READY,
        "error": CHATBOT_ERROR if not CHATBOT_READY else None
    })

# Debug endpoints
@app.route('/debug/status', methods=['GET'])
def debug_status():
    """Debug endpoint to see what's happening"""
    try:
        debug_info = {
            "chatbot_ready": CHATBOT_READY,
            "has_db_instance": db is not None,
            "has_bot_instance": bot is not None,
            "chatbot_error": CHATBOT_ERROR,
            "initialization_time": f"{initialization_time:.2f}s" if CHATBOT_READY else None,
            "startup_initialization": True  # This is the key difference!
        }
        
        # Try to get vector database stats if available
        if db:
            try:
                stats = db.index.describe_index_stats()
                debug_info["vector_count"] = stats.total_vector_count
                if db.namespace in stats.namespaces:
                    debug_info["namespace_vectors"] = stats.namespaces[db.namespace].vector_count
            except Exception as e:
                debug_info["vector_db_error"] = str(e)
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({"error": f"Debug failed: {str(e)}"})

@app.route('/ping', methods=['GET'])
def ping():
    """Simple ping to test if server is responsive"""
    return jsonify({
        "message": "pong",
        "timestamp": str(datetime.now()),
        "ready": CHATBOT_READY
    })

if __name__ == '__main__':
    # The initialization already happened above when the module loaded
    print("🚀 Flask API ready - chatbot pre-initialized!")
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
    