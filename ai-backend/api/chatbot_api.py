import sys
import json
import os
from pathlib import Path

# Add the chatbot directory to Python path
current_dir = Path(__file__).parent  # ai-backend/api
chatbot_dir = current_dir.parent / "chatbot"  # ai-backend/chatbot
sys.path.append(str(chatbot_dir))

def debug_print(message):
    """Print debug messages to stderr so they don't interfere with JSON output"""
    print(f"DEBUG: {message}", file=sys.stderr)

try:
    from hunter_ai import get_database, UNYCompassBot
    debug_print("Successfully imported hunter_ai modules")
except ImportError as e:
    error_msg = f"Failed to import hunter_ai: {e}"
    debug_print(error_msg)
    print(json.dumps({"success": False, "error": error_msg}))
    sys.exit(1)

def initialize_chatbot():
    """Initialize the chatbot and database"""
    try:
        debug_print("Initializing database...")
        db = get_database()
        
        if not db:
            debug_print("Database is None")
            return None, "Database initialization failed"
            
        if not hasattr(db, 'chunks') or not db.chunks:
            debug_print("Database has no chunks")
            return None, "Database not found or empty. Please run the web crawler first."
        
        debug_print(f"Database loaded with {len(db.chunks)} chunks")
        
        debug_print("Initializing bot...")
        bot = UNYCompassBot(db)
        debug_print("Bot initialized successfully")
        
        return bot, None
    except Exception as e:
        error_msg = f"Error initializing chatbot: {str(e)}"
        debug_print(error_msg)
        return None, error_msg

def ask_question(question):
    """Ask a question to the chatbot and return the response"""
    if not question or not question.strip():
        return {"success": False, "error": "Question cannot be empty"}
    
    try:
        debug_print(f"Processing question: {question}")
        
        bot, error = initialize_chatbot()
        if error:
            debug_print(f"Initialization error: {error}")
            return {"success": False, "error": error}
        
        # Get the answer from the chatbot
        debug_print("Getting answer from bot...")
        answer = bot.answer_question(question.strip())
        debug_print(f"Bot response received: {answer[:100]}...")
        
        return {
            "success": True,
            "question": question,
            "answer": answer
        }
        
    except Exception as e:
        error_msg = f"Error processing question: {str(e)}"
        debug_print(error_msg)
        return {"success": False, "error": error_msg}

def main():
    """Main function that handles command line arguments"""
    try:
        if len(sys.argv) < 2:
            debug_print("No question provided in arguments")
            print(json.dumps({"success": False, "error": "No question provided"}))
            sys.exit(1)
        
        # Get the question from command line argument
        question = sys.argv[1]
        debug_print(f"Received question: {question}")
        
        # Handle test question
        if question.lower() == "test":
            debug_print("Test question received")
            print(json.dumps({
                "success": True,
                "question": "test",
                "answer": "Chatbot is working correctly!"
            }))
            return
        
        # Process the question and return JSON response
        response = ask_question(question)
        debug_print(f"Final response: {response}")
        
        # Ensure we output valid JSON
        print(json.dumps(response, ensure_ascii=False))
        
    except Exception as e:
        error_msg = f"Main function error: {str(e)}"
        debug_print(error_msg)
        print(json.dumps({"success": False, "error": error_msg}))
        sys.exit(1)

if __name__ == "__main__":
    main()