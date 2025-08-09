import { Request, Response } from "express";
import { ChatService } from "./chatService";
import { ChatbotService } from "../chatbot/chatbotService";
import { ConversationContextManager } from "./contextManager";

export class ChatController {
    getPersonalityTypes = async (req: Request, res: Response) => {
        try {
            const types = await ChatService.getPersonalityTypes();
            res.json(types);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch personality types" });
        }
    };

    createChatSession = async (req: any, res: Response) => {
        try {
            if (!req.user || !req.user.userId) {
                console.error("No authenticated user found");
                return res.status(401).json({
                    message: "Authentication required",
                    error: "No user found in request"
                });
            }

            const sessionData = {
                ...req.body,
                userId: req.user.userId
            };

            const session = await ChatService.createChatSession(sessionData);
            res.json(session);
        } catch (error) {
            console.error("Create chat session error:", error);

            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const errorDetails = error instanceof Error ? error.stack : error;

            res.status(500).json({
                message: "Failed to create chat session",
                error: errorMessage,
                details: errorDetails
            });
        }
    };

    getChatSessions = async (req: any, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const offset = (page - 1) * limit;

            const totalSessions = await ChatService.getTotalSessionsByUserId(req.user.userId);
            const sessions = await ChatService.getChatSessionsByUserId(req.user.userId, limit, offset);

            res.json({
                sessions,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalSessions / limit),
                    totalSessions,
                    hasMore: page * limit < totalSessions
                }
            });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch chat sessions" });
        }
    };

    createMessage = async (req: any, res: Response) => {
        try {
            const validatedData = req.body;

            // Still save user message to database for persistence
            const userMessage = await ChatService.createMessage(validatedData);

            if (validatedData.isUser) {
                try {
                    // 🚀 FAST PATH: Get context from memory instead of slow database query
                    const contextString = ConversationContextManager.getContextString(
                        validatedData.chatSessionId
                    );

                    const fullPrompt = `${contextString}User: ${validatedData.content}`;

                    console.log('🚀 FAST PATH: Using in-memory context');
                    console.log(`📏 Context size: ${contextString.length} characters`);
                    console.log(`🔍 Session ${validatedData.chatSessionId} - calling Flask API...`);

                    const startTime = Date.now();
                    const chatbotResponse = await ChatbotService.callFlaskChatbot(fullPrompt);
                    const apiTime = Date.now() - startTime;

                    console.log(`⚡ Flask API completed in ${apiTime}ms`);

                    // 🔍 EXTENSIVE DEBUGGING - keeping your original debug logs
                    console.log('🔍 DEBUG: ChatbotService returned:');
                    console.log('🔍 DEBUG: Response type:', typeof chatbotResponse);
                    console.log('🔍 DEBUG: Response keys:', Object.keys(chatbotResponse || {}));
                    console.log('🔍 DEBUG: chatbotResponse.success:', chatbotResponse?.success);
                    console.log('🔍 DEBUG: chatbotResponse.answer:', chatbotResponse?.answer?.substring(0, 100) + '...');
                    console.log('🔍 DEBUG: chatbotResponse.response:', chatbotResponse?.response?.substring(0, 100) + '...');
                    console.log('🔍 DEBUG: chatbotResponse.error:', chatbotResponse?.error);

                    // Check what's actually happening in the condition
                    const hasSuccess = chatbotResponse?.success;
                    const hasAnswer = chatbotResponse?.answer || chatbotResponse?.response;
                    console.log('🔍 DEBUG: hasSuccess:', hasSuccess);
                    console.log('🔍 DEBUG: hasAnswer:', !!hasAnswer);

                    const aiResponseContent = chatbotResponse?.success
                        ? chatbotResponse.answer || chatbotResponse.response
                        : `FALLBACK TRIGGERED: success=${chatbotResponse?.success}, error=${chatbotResponse?.error}`;

                    console.log('🔍 DEBUG: Final AI content preview:', aiResponseContent.substring(0, 200) + '...');

                    // Save AI response to database
                    const aiResponse = await ChatService.createMessage({
                        chatSessionId: validatedData.chatSessionId,
                        content: aiResponseContent,
                        isUser: false,
                    });

                    // 💾 Update in-memory context with both messages
                    ConversationContextManager.addMessage(
                        validatedData.chatSessionId,
                        validatedData.content,
                        true
                    );
                    ConversationContextManager.addMessage(
                        validatedData.chatSessionId,
                        aiResponseContent,
                        false
                    );

                    await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
                    res.json({ userMessage, aiResponse });

                } catch (error) {
                    console.error("🔍 DEBUG: Caught error in fast path:");
                    console.error("🔍 DEBUG: Error type:", typeof error);
                    console.error("🔍 DEBUG: Error message:", error instanceof Error ? error.message : 'Not an Error object');
                    console.error("🔍 DEBUG: Error stack:", error instanceof Error ? error.stack : 'No stack');

                    const fallbackResponse = await ChatService.createMessage({
                        chatSessionId: validatedData.chatSessionId,
                        content: `CAUGHT ERROR: ${error instanceof Error ? error.message : 'Unknown error type'}`,
                        isUser: false,
                    });

                    await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
                    res.json({ userMessage, aiResponse: fallbackResponse });
                }
            } else {
                res.json(userMessage);
            }
        } catch (error) {
            console.error("Create message error:", error);
            res.status(500).json({
                message: "Failed to create message",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    };

    getMessagesBySessionId = async (req: any, res: Response) => {
        try {
            const sessionId = parseInt(req.params.sessionId);

            const userSessions = await ChatService.getChatSessionsByUserId(req.user.userId);
            const sessionExists = userSessions.some(session => session.id === sessionId);

            if (!sessionExists) {
                console.warn("Access denied to session:", sessionId);
                return res.status(403).json({ message: "Access denied to this chat session" });
            }

            const messages = await ChatService.getMessagesBySessionId(sessionId);

            // 💾 POPULATE in-memory context when loading messages
            // This ensures context is available even after server restarts
            ConversationContextManager.clearSession(sessionId); // Clear any stale data

            // Add recent messages to context (last 4 messages)
            const recentMessages = messages.slice(-4);
            for (const msg of recentMessages) {
                ConversationContextManager.addMessage(sessionId, msg.content, msg.isUser);
            }

            console.log(`💾 Populated context for session ${sessionId} with ${recentMessages.length} messages`);

            res.json(messages);
        } catch (error) {
            console.error("Get messages error:", error);
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    };

    // Optional: Debug endpoint to see context manager stats
    getContextStats = async (req: any, res: Response) => {
        try {
            const stats = ConversationContextManager.getStats();
            res.json({
                contextManager: stats,
                timestamp: new Date().toISOString(),
                message: "Context manager statistics"
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get context stats',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}