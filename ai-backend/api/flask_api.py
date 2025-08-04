import sys
import json
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

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
CORS(app, origins=[
    "http://localhost:3000",
    "https://unycompass.vercel.app", 
    "https://*.vercel.app"
])

def initialize_chatbot():
    """Initialize the chatbot and database"""
    try:
        # Initialize the database
        db = UNYCompassDatabase()
        
        # Create the bot
        bot = UNYCompassBot(db)
        return bot, None
    except Exception as e:
        return None, f"Error initializing chatbot: {str(e)}"

def ask_question(question):
    """Ask a question to the chatbot and return the response"""
    if not question or not question.strip():
        return {"error": "Question cannot be empty"}
    
    try:
        bot, error = initialize_chatbot()
        if error:
            return {"error": error}
        
        answer = bot.answer_question(question.strip())
        
        return {
            "success": True,
            "question": question,
            "answer": answer,
            "timestamp": str(datetime.now())
        }
        
    except Exception as e:
        return {"error": f"Error processing question: {str(e)}"}

# Flask API Routes
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Hunter College Chatbot API is running"})

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
    return jsonify({"status": "ready"})

if __name__ == '__main__':
    # Change to port 5001 to avoid conflict with your main Express server
    app.run(host='0.0.0.0', port=5001, debug=True)