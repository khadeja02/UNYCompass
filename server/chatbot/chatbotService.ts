import axios from 'axios';

// Create persistent axios instance with connection pooling
const flaskApiClient = axios.create({
    baseURL: process.env.FLASK_API_URL || "https://unycompass-production.up.railway.app",
    timeout: 120000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
    },
    maxRedirects: 3,
    maxContentLength: 50 * 1024 * 1024,
});

// Add request/response interceptors for debugging
flaskApiClient.interceptors.request.use(request => {
    console.log(`🌐 Flask API Request: ${request.method?.toUpperCase()} ${request.url}`);
    if (request.data?.ui_session_id) {
        console.log(`📋 UI Session ID: ${request.data.ui_session_id}`);
    }
    return request;
});

flaskApiClient.interceptors.response.use(
    response => {
        const responseTime = response.headers['x-response-time'] || 'unknown';
        console.log(`✅ Flask API Response: ${response.status} (${responseTime})`);
        return response;
    },
    error => {
        const status = error.response?.status || 'no response';
        console.log(`❌ Flask API Error: ${status} - ${error.message}`);
        return Promise.reject(error);
    }
);

export class ChatbotService {
    private static readonly FLASK_API_URL = process.env.FLASK_API_URL || "https://unycompass-production.up.railway.app";

    static {
        console.log('🔍 ChatbotService Stateless Config:');
        console.log('🔍 FLASK_API_URL:', this.FLASK_API_URL);
        console.log('🔍 AI Session management: DISABLED (terminal-like behavior)');
        console.log('🔍 UI Session tracking: ENABLED');
    }

    static async callFlaskChatbot(question: string, sessionId?: number) {
        try {
            const startTime = Date.now();
            console.log(`🤖 Calling Flask API for UI session ${sessionId}: "${question.substring(0, 50)}..."`);

            const requestPayload = {
                message: question,
                ui_session_id: sessionId
            };

            const response = await flaskApiClient.post('/api/chatbot/ask', requestPayload);

            const responseTime = Date.now() - startTime;
            console.log(`✅ Flask response received in ${responseTime}ms:`, {
                status: response.status,
                hasAnswer: !!(response.data.response || response.data.answer),
                processingTime: response.data.processing_time
            });

            return {
                success: true,
                question: response.data.question,
                answer: response.data.response || response.data.answer,
                response: response.data.response || response.data.answer,
                timestamp: response.data.timestamp,
                ui_session_id: sessionId,
                responseTime: responseTime,
                processingTime: response.data.processing_time
            };

        } catch (error: any) {
            const responseTime = Date.now() - (error.config?.startTime || Date.now());

            console.error('❌ Flask API error:', {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.response?.status,
                sessionId: sessionId,
                responseTime: responseTime,
                timeout: error.code === 'ECONNABORTED'
            });

            let errorMessage = 'Failed to connect to chatbot service';

            if (error.response) {
                errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
            } else if (error.request) {
                if (error.code === 'ECONNREFUSED') {
                    errorMessage = 'Flask API connection refused - service may be down';
                } else if (error.code === 'ENOTFOUND') {
                    errorMessage = 'Cannot reach Flask API - DNS resolution failed';
                } else if (error.code === 'ECONNABORTED') {
                    errorMessage = 'Request timeout - Flask API took too long to respond';
                } else {
                    errorMessage = `Network error: ${error.message}`;
                }
            }

            return {
                success: false,
                error: errorMessage,
                responseTime: responseTime,
                debugInfo: {
                    errorCode: error.code,
                    hasResponse: !!error.response,
                    timeout: error.code === 'ECONNABORTED',
                    sessionId: sessionId
                }
            };
        }
    }

    static async askQuestion(question: string, sessionId?: number) {
        console.log(`🤖 ChatbotService.askQuestion (stateless mode):`, {
            question: question.substring(0, 50) + '...',
            uiSessionId: sessionId,
            flaskUrl: this.FLASK_API_URL
        });

        const result = await this.callFlaskChatbot(question, sessionId);

        console.log(`🤖 ChatbotService.askQuestion result:`, {
            success: result.success,
            hasAnswer: !!(result as any).answer,
            uiSessionId: sessionId,
            responseTime: (result as any).responseTime,
            error: (result as any).error || 'none'
        });

        return result;
    }


    // Session clearing not needed since AI doesn't maintain memory

    static async checkStatus() {
        try {
            console.log(`🔍 Checking Flask API status...`);
            const startTime = Date.now();

            const response = await flaskApiClient.get('/api/chatbot/status');
            const responseTime = Date.now() - startTime;

            console.log(`✅ Status check completed in ${responseTime}ms:`, response.data);

            return {
                success: true,
                status: response.data.status,
                pythonWorking: response.data.pythonWorking,
                message: response.data.message || 'Flask API is ready',
                responseTime: responseTime
            };

        } catch (error: any) {
            const responseTime = Date.now() - (error.config?.startTime || Date.now());

            console.error('❌ Status check error:', {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                responseTime: responseTime
            });

            let errorMessage = 'Flask API is offline';

            if (error.code === 'ECONNREFUSED') {
                errorMessage = `Flask API connection refused`;
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = `Cannot reach Flask API - DNS resolution failed`;
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Status check timeout';
            } else if (error.response) {
                errorMessage = `Flask API error: ${error.response.status}`;
            }

            return {
                success: false,
                error: errorMessage,
                responseTime: responseTime,
                debugInfo: {
                    errorCode: error.code,
                    hasResponse: !!error.response
                }
            };
        }
    }

    static async warmup() {
        try {
            console.log('🔥 Warming up Flask API...');
            const response = await flaskApiClient.post('/api/chatbot/warmup');
            console.log('✅ Warmup response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Warmup failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async healthCheck() {
        try {
            const response = await flaskApiClient.get('/');
            return {
                success: true,
                status: response.data.status,
                ready: response.data.chatbot_ready
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}