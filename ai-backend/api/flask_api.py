import sys
import json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import re

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

# Add custom origin checker if using regex
@app.after_request
def apply_cors(response):
    origin = request.headers.get('Origin')
    if origin and re.match(r"https:\/\/.*unycompass.*\.vercel\.app", origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Initialize the chatbot ONCE when the server starts
print("🤖 Initializing Hunter College Chatbot...")
try:
    db = UNYCompassDatabase()
    bot = UNYCompassBot(db)
    print("✅ Chatbot initialized successfully!")
    CHATBOT_READY = True
    CHATBOT_ERROR = None
except Exception as e:
    print(f"❌ Failed to initialize chatbot: {e}")
    CHATBOT_READY = False
    CHATBOT_ERROR = str(e)
    bot = None

def ask_question(question):
    """Ask a question to the chatbot and return the response"""
    if not CHATBOT_READY:
        return {"error": f"Chatbot not available: {CHATBOT_ERROR}"}
    
    if not question or not question.strip():
        return {"error": "Question cannot be empty"}
    
    try:
        # Use the SAME bot instance for all requests
        answer = bot.answer_question(question.strip())
        
        return {
            "success": True,
            "question": question,
            "answer": answer,
            "timestamp": str(datetime.now())
        }
        
    except Exception as e:
        return {"error": f"Error processing question: {str(e)}"}

# Flask API Routes - Root routes for backward compatibility
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "message": "Hunter College Chatbot API is running",
        "chatbot_ready": CHATBOT_READY
    })

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Please provide a 'message' field in your request"}), 400
    
    response = ask_question(data['message'])
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
    
    response = ask_question(data['message'])
    if "error" in response:
        return jsonify(response), 500
    
    return jsonify({
        "question": response["question"],
        "response": response["answer"],
        "timestamp": response["timestamp"]
    })

# Optional: Reset conversation memory endpoint
@app.route('/api/chatbot/reset', methods=['POST'])
def reset_conversation():
    """Reset the conversation memory for a fresh start"""
    if not CHATBOT_READY:
        return jsonify({"error": "Chatbot not available"}), 500
    
    try:
        # Reset the conversation memory
        bot.memory = type(bot.memory)()  # Create new memory instance
        return jsonify({"message": "Conversation memory reset successfully"})
    except Exception as e:
        return jsonify({"error": f"Failed to reset conversation: {str(e)}"}), 500

if __name__ == '__main__':
    # Change to port 5001 to avoid conflict with your main Express server
    app.run(host='0.0.0.0', port=5001, debug=True)