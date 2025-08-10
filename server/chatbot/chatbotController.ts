import { Request, Response } from "express";
import { ChatbotService } from "./chatbotService";

export class ChatbotController {
    static async ask(req: any, res: Response) {
        try {
            const { question, chatSessionId } = req.body; // ✅ FIXED: Extract session ID

            if (!question || !question.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Question is required'
                });
            }

            console.log(`🚀 User ${req.user.username} asked: "${question}" in session ${chatSessionId}`);

            // ✅ FIXED: Pass session ID to Flask API for proper memory isolation
            const response = await ChatbotService.askQuestion(question, chatSessionId);

            console.log(`🤖 ChatbotService response:`, {
                success: response.success,
                hasAnswer: !!(response as any).answer,
                sessionId: chatSessionId,
                error: (response as any).error || 'none'
            });

            // Check if the response indicates an error
            if (!(response as any).success) {
                console.error(`❌ Chatbot service error:`, (response as any).error);
                return res.status(500).json({
                    success: false,
                    error: 'Chatbot error',
                    details: (response as any).error
                });
            }

            // ✅ Success response
            res.json({
                success: true,
                question: (response as any).question,
                answer: (response as any).answer,
                user: req.user.username,
                sessionId: chatSessionId, // ✅ Include session ID in response
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            console.error('❌ Chatbot API controller error:', {
                message: error.message,
                stack: error.stack?.substring(0, 500)
            });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }

    static async status(req: any, res: Response) {
        try {
            console.log('🔍 Checking chatbot status...');

            // Test if Python chatbot is working
            const testResponse = await ChatbotService.checkStatus();
            console.log('✅ Status check response:', testResponse);

            const isWorking = (testResponse as any).success;

            res.json({
                status: isWorking ? 'online' : 'offline',
                pythonWorking: isWorking,
                message: isWorking ? 'Chatbot is ready' : ((testResponse as any).error || 'Chatbot unavailable'),
                debugInfo: (testResponse as any).debugInfo || {}
            });
        } catch (error: any) {
            console.error('❌ Status check error:', error);
            res.json({
                status: 'offline',
                pythonWorking: false,
                message: error.message,
                debugInfo: {
                    errorInController: true
                }
            });
        }
    }

    // ✅ NEW: Add endpoint to clear session memory
    static async clearSession(req: any, res: Response) {
        try {
            const { sessionId } = req.params;

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Session ID is required'
                });
            }

            console.log(`🗑️ Clearing chatbot memory for session ${sessionId}`);

            // This calls the Flask API endpoint to clear session memory
            const response = await ChatbotService.clearSessionMemory(parseInt(sessionId));

            res.json({
                success: true,
                message: `Session ${sessionId} memory cleared`,
                details: response
            });

        } catch (error: any) {
            console.error('❌ Clear session error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear session memory',
                details: error.message
            });
        }
    }
}