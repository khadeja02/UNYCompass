import { Request, Response } from "express";
import { ChatbotService } from "./chatbotService";
import { ChatService } from "../chat/chatService";

export class ChatbotController {
    // Flask API first (stateless), then batch save
    static async ask(req: any, res: Response) {
        try {
            const { question, chatSessionId } = req.body;

            if (!question || !question.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Question is required'
                });
            }

            if (!chatSessionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Chat session ID is required'
                });
            }

            console.log(`🚀 User ${req.user.username} asked: "${question.substring(0, 50)}..." in UI session ${chatSessionId} (stateless AI)`);

            const startTime = Date.now();

            // 1. Get AI response first (Flask API call - stateless like terminal)
            const flaskResponse = await ChatbotService.askQuestion(question, chatSessionId);

            if (!flaskResponse.success) {
                console.error(`❌ Flask API error:`, flaskResponse.error);
                return res.status(500).json({
                    success: false,
                    error: 'Hunter AI service error',
                    details: flaskResponse.error
                });
            }

            const aiAnswer = flaskResponse.answer || flaskResponse.response;
            const processingTime = Date.now() - startTime;

            console.log(`✅ AI response received in ${processingTime}ms (stateless mode), now saving conversation...`);

            // 2. Save both messages after successful AI response
            try {
                const { userMessage, aiMessage } = await ChatService.saveConversationPair(
                    {
                        chatSessionId: chatSessionId,
                        content: question,
                        isUser: true
                    },
                    {
                        chatSessionId: chatSessionId,
                        content: aiAnswer,
                        isUser: false
                    }
                );

                // 3. Update session timestamp
                await ChatService.updateChatSessionTimestamp(chatSessionId);

                const totalTime = Date.now() - startTime;
                console.log(`✅ Streamlined stateless flow completed in ${totalTime}ms for ${req.user.username}`);

                // 4. Return complete response with saved messages
                res.json({
                    success: true,
                    question: question,
                    answer: aiAnswer,
                    userMessage: userMessage,
                    aiMessage: aiMessage,
                    user: req.user.username,
                    sessionId: chatSessionId,
                    processingTime: processingTime,
                    totalTime: totalTime,
                    mode: 'stateless', // Indicate this was processed without AI memory
                    timestamp: new Date().toISOString()
                });

            } catch (saveError: any) {
                console.error('❌ Error saving conversation after successful AI response:', saveError);

                // Still return the AI response even if save failed
                res.json({
                    success: true,
                    question: question,
                    answer: aiAnswer,
                    user: req.user.username,
                    sessionId: chatSessionId,
                    processingTime: processingTime,
                    mode: 'stateless',
                    timestamp: new Date().toISOString(),
                    warning: 'AI response successful but database save failed',
                    saveError: saveError.message
                });
            }

        } catch (error: any) {
            console.error('❌ Chatbot controller error:', {
                message: error.message,
                user: req.user?.username,
                sessionId: req.body?.chatSessionId
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

            const testResponse = await ChatbotService.checkStatus();
            console.log('✅ Status check response:', testResponse);

            const isWorking = (testResponse as any).success;

            res.json({
                status: isWorking ? 'online' : 'offline',
                pythonWorking: isWorking,
                message: isWorking ? 'Hunter AI is ready (stateless mode)' : ((testResponse as any).error || 'Chatbot unavailable'),
                mode: 'stateless',
                debugInfo: (testResponse as any).debugInfo || {}
            });
        } catch (error: any) {
            console.error('❌ Status check error:', error);
            res.json({
                status: 'offline',
                pythonWorking: false,
                message: error.message,
                mode: 'stateless',
                debugInfo: {
                    errorInController: true
                }
            });
        }
    }

}