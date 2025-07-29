import axios from 'axios';

export class ChatbotService {
    // Flask API endpoint - adjust port if your Flask app runs on a different port
    private static readonly FLASK_API_URL = 'http://localhost:5001';

    static async callFlaskChatbot(question: string, personalityType?: string) {
        try {
            // Prepare the question with personality context if provided
            let contextualQuestion = question;
            if (personalityType && personalityType !== 'chatbot' && personalityType !== 'unknown') {
                contextualQuestion = `I am a ${personalityType.toUpperCase()} personality type. ${question}`;
            }

            console.log(`Calling Flask API: ${this.FLASK_API_URL}/chat`);
            console.log(`Question to send: ${contextualQuestion}`);

            const response = await axios.post(`${this.FLASK_API_URL}/chat`, {
                message: contextualQuestion
            }, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Flask API response:', response.data);

            // Transform Flask response to match expected format
            return {
                success: true,
                question: response.data.question,
                answer: response.data.response,
                timestamp: response.data.timestamp
            };

        } catch (error: any) {
            console.error('Flask API error:', error);

            let errorMessage = 'Failed to connect to chatbot service';

            if (error.response) {
                // Server responded with error status
                errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = 'No response from chatbot service. Make sure Flask API is running.';
            } else {
                // Something else happened
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
            console.log(`Checking Flask API status: ${this.FLASK_API_URL}/status`);

            const response = await axios.get(`${this.FLASK_API_URL}/status`, {
                timeout: 10000 // 10 second timeout for status check
            });

            console.log('Status check response:', response.data);

            return {
                success: true,
                status: response.data.status,
                message: 'Flask API is ready'
            };

        } catch (error: any) {
            console.error('Status check error:', error);

            let errorMessage = 'Flask API is offline';
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Flask API is not running. Please start the Flask server.';
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }
}