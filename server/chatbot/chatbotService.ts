import axios from 'axios';

export class ChatbotService {
    private static readonly FLASK_API_URL =
        process.env.FLASK_API_URL || "https://unycompass-production.up.railway.app";

    static {
        console.log('🔍 ChatbotService Debug Info:');
        console.log('🔍 process.env.FLASK_API_URL:', process.env.FLASK_API_URL);
        console.log('🔍 Final FLASK_API_URL:', this.FLASK_API_URL);
        console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    }

    static async callFlaskChatbot(question: string) {
        try {
            const endpoint = `${this.FLASK_API_URL}/api/chatbot/ask`;
            console.log(`🌐 Calling Flask API: ${endpoint}`);
            console.log(`📝 Question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);

            // SIMPLIFIED: Send only the message, no personality context
            const requestPayload = {
                message: question
            };
            console.log(`📦 Request payload:`, JSON.stringify(requestPayload, null, 2));

            const response = await axios.post(endpoint, requestPayload, {
                timeout: 120000, // Increase to 2 minutes for Hunter AI processing
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('✅ Flask API response received:', {
                status: response.status,
                statusText: response.statusText,
                hasData: !!response.data,
                dataKeys: Object.keys(response.data || {}),
                fullResponse: response.data
            });

            // Handle the Flask API response format
            return {
                success: true,
                question: response.data.question,
                answer: response.data.response || response.data.answer,
                response: response.data.response || response.data.answer,
                timestamp: response.data.timestamp
            };

        } catch (error: any) {
            console.error('❌ Flask API error details:', {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                requestUrl: `${this.FLASK_API_URL}/api/chatbot/ask`,
                timeout: error.code === 'ECONNABORTED' ? 'YES' : 'NO'
            });

            let errorMessage = 'Failed to connect to chatbot service';
            let errorDetails = '';

            if (error.response) {
                console.error('❌ Server error response:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    headers: error.response.headers
                });
                errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
                errorDetails = JSON.stringify(error.response.data);
            } else if (error.request) {
                console.error('❌ No response received:', {
                    code: error.code,
                    message: error.message,
                    url: this.FLASK_API_URL
                });

                if (error.code === 'ECONNREFUSED') {
                    errorMessage = `Flask API connection refused. Is it running on ${this.FLASK_API_URL}?`;
                } else if (error.code === 'ENOTFOUND') {
                    errorMessage = `Cannot reach Flask API at ${this.FLASK_API_URL}. DNS resolution failed.`;
                } else if (error.code === 'ECONNABORTED') {
                    errorMessage = 'Request timeout. Flask API took too long to respond.';
                } else if (error.code === 'EHOSTUNREACH') {
                    errorMessage = `Host unreachable: ${this.FLASK_API_URL}`;
                } else {
                    errorMessage = `Network error (${error.code}): ${error.message}`;
                }
            } else {
                console.error('❌ Request setup error:', error.message);
                errorMessage = error.message || 'Unknown error occurred';
            }

            return {
                success: false,
                error: errorMessage,
                details: errorDetails,
                url: this.FLASK_API_URL,
                debugInfo: {
                    errorCode: error.code,
                    errorName: error.name,
                    hasResponse: !!error.response,
                    hasRequest: !!error.request
                }
            };
        }
    }

    static async askQuestion(question: string) {
        console.log(`🤖 ChatbotService.askQuestion called:`, {
            question: question.substring(0, 50) + '...',
            flaskUrl: this.FLASK_API_URL
        });

        const result = await this.callFlaskChatbot(question);

        console.log(`🤖 ChatbotService.askQuestion result:`, {
            success: result.success,
            hasAnswer: !!(result as any).answer,
            error: (result as any).error || 'none'
        });

        return result;
    }

    static async checkStatus() {
        try {
            const endpoint = `${this.FLASK_API_URL}/api/chatbot/status`;
            console.log(`🔍 Checking Flask API status: ${endpoint}`);

            const response = await axios.get(endpoint, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('✅ Status check response:', {
                status: response.status,
                data: response.data
            });

            return {
                success: true,
                status: response.data.status,
                pythonWorking: response.data.pythonWorking,
                message: response.data.message || 'Flask API is ready',
                url: this.FLASK_API_URL
            };

        } catch (error: any) {
            console.error('❌ Status check error:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                url: this.FLASK_API_URL
            });

            let errorMessage = 'Flask API is offline';

            if (error.code === 'ECONNREFUSED') {
                errorMessage = `Flask API connection refused at ${this.FLASK_API_URL}`;
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = `Cannot reach Flask API at ${this.FLASK_API_URL}. DNS resolution failed.`;
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Status check timeout. Flask API is not responding.';
            } else if (error.response) {
                errorMessage = `Flask API error: ${error.response.status} ${error.response.statusText}`;
            }

            return {
                success: false,
                error: errorMessage,
                url: this.FLASK_API_URL,
                debugInfo: {
                    errorCode: error.code,
                    hasResponse: !!error.response
                }
            };
        }
    }
}