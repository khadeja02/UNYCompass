import axios from 'axios';

export class ChatbotService {
    private static readonly FLASK_API_URL =
        process.env.FLASK_API_URL || "https://unycompass-production.up.railway.app";
    // Debug logging
    static {
        console.log('🔍 Debug Info:');
        console.log('🔍 process.env.FLASK_API_URL:', process.env.FLASK_API_URL);
        console.log('🔍 Final FLASK_API_URL:', this.FLASK_API_URL);
        console.log('🔍 All env vars:', Object.keys(process.env).filter(k => k.includes('FLASK')));
    }
    static async callFlaskChatbot(question: string, personalityType?: string) {
        try {
            let contextualQuestion = question;
            if (personalityType && personalityType !== 'chatbot' && personalityType !== 'unknown') {
                contextualQuestion = `I am a ${personalityType.toUpperCase()} personality type. ${question}`;
            }

            console.log(`🌐 Calling Flask API: ${this.FLASK_API_URL}/chat`);
            console.log(`📝 Question to send: ${contextualQuestion.substring(0, 100)}...`);

            const response = await axios.post(`${this.FLASK_API_URL}/chat`, {
                message: contextualQuestion
            }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('✅ Flask API response received:', response.data);

            return {
                success: true,
                question: response.data.question,
                answer: response.data.response,
                response: response.data.response,
                timestamp: response.data.timestamp
            };

        } catch (error: any) {
            console.error('❌ Flask API error:', error);

            let errorMessage = 'Failed to connect to chatbot service';

            if (error.response) {
                console.error('❌ Server error response:', error.response.data);
                errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
            } else if (error.request) {
                console.error('❌ No response received:', error.request);
                errorMessage = 'No response from chatbot service. Make sure Flask API is running on port 5001.';
            } else {
                console.error('❌ Request setup error:', error.message);
                errorMessage = error.message || 'Unknown error occurred';
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    static async askQuestion(question: string, personalityType?: string) {
        return await this.callFlaskChatbot(question, personalityType);
    }

    static async checkStatus() {
        try {
            console.log(`🔍 Checking Flask API status: ${this.FLASK_API_URL}/status`);

            const response = await axios.get(`${this.FLASK_API_URL}/status`, {
                timeout: 10000
            });

            console.log('✅ Status check response:', response.data);

            return {
                success: true,
                status: response.data.status,
                message: 'Flask API is ready'
            };

        } catch (error: any) {
            console.error('❌ Status check error:', error);

            let errorMessage = 'Flask API is offline';
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Flask API is not running. Please start the Flask server on port 5001.';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'Cannot reach Flask API. Check if it\'s running on localhost:5001.';
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }
}
