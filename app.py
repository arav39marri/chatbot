from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class ConversationManager:
    """Manages conversation history and interactions"""
    
    def __init__(self):
        self.history = []
        self.model = "llama-3.1-8b-instant"
    
    def add_exchange(self, user_message: str, assistant_response: str) -> dict:
        """Add a message exchange to history"""
        exchange = {
            "user": user_message,
            "assistant": assistant_response,
            "timestamp": datetime.now().isoformat()
        }
        self.history.append(exchange)
        return exchange
    
    def get_history(self) -> list:
        """Get all conversation history"""
        return self.history
    
    def clear_history(self) -> None:
        """Clear all conversation history"""
        self.history = []
    
    def get_total_exchanges(self) -> int:
        """Get total number of exchanges"""
        return len(self.history)
    
    def build_message_context(self, current_message: str) -> list:
        """Build message list with full conversation context"""
        messages = []
        
        # Add previous exchanges
        for exchange in self.history:
            messages.append({"role": "user", "content": exchange["user"]})
            messages.append({"role": "assistant", "content": exchange["assistant"]})
        
        # Add current message
        messages.append({"role": "user", "content": current_message})
        return messages
    
    def generate_summary(self) -> str:
        """Generate a formatted summary of conversations"""
        summary = "Previous conversations:\n"
        for i, exchange in enumerate(self.history, 1):
            summary += f"\n{i}. User: {exchange['user']}\n   Bot: {exchange['assistant']}"
        return summary


class GroqChatBot:
    """Handles Groq API interactions"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.1-8b-instant"
    
    def get_response(self, messages: list) -> str:
        """Get response from Groq API"""
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        return completion.choices[0].message.content


class ChatAPI:
    """Flask API for chatbot"""
    
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)
        
        self.conversation_manager = ConversationManager()
        self.chatbot = GroqChatBot()
        
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup all API routes"""
        self.app.route("/chat", methods=["POST"])(self.handle_chat)
        self.app.route("/health", methods=["GET"])(self.handle_health)
        self.app.route("/history", methods=["GET"])(self.handle_get_history)
        self.app.route("/history", methods=["DELETE"])(self.handle_clear_history)
        self.app.route("/summary", methods=["GET"])(self.handle_get_summary)
    
    def handle_chat(self):
        """Handle chat endpoint"""
        try:
            data = request.get_json()
            
            if not data or "message" not in data:
                return jsonify({
                    "error": "No message provided",
                    "status": "failed"
                }), 400
            
            user_message = data["message"]
            
            # Build context and get response
            messages = self.conversation_manager.build_message_context(user_message)
            response = self.chatbot.get_response(messages)
            
            # Store exchange
            self.conversation_manager.add_exchange(user_message, response)
            
            return jsonify({
                "response": response,
                "status": "success",
                "model": self.chatbot.model,
                "conversation_id": self.conversation_manager.get_total_exchanges(),
                "history_count": self.conversation_manager.get_total_exchanges()
            }), 200
        
        except Exception as e:
            return jsonify({
                "error": str(e),
                "status": "failed"
            }), 500
    
    def handle_health(self):
        """Handle health check endpoint"""
        return jsonify({"status": "healthy"}), 200
    
    def handle_get_history(self):
        """Handle get history endpoint"""
        return jsonify({
            "status": "success",
            "history": self.conversation_manager.get_history(),
            "total_exchanges": self.conversation_manager.get_total_exchanges()
        }), 200
    
    def handle_clear_history(self):
        """Handle clear history endpoint"""
        self.conversation_manager.clear_history()
        return jsonify({
            "status": "success",
            "message": "Conversation history cleared"
        }), 200
    
    def handle_get_summary(self):
        """Handle get summary endpoint"""
        summary = self.conversation_manager.generate_summary()
        return jsonify({
            "status": "success",
            "summary": summary,
            "total_exchanges": self.conversation_manager.get_total_exchanges()
        }), 200
    
    def run(self, debug=True, host="0.0.0.0", port=5000):
        """Run the Flask app"""
        self.app.run(debug=debug, host=host, port=port)


if __name__ == "__main__":
    chat_api = ChatAPI()
    chat_api.run()
