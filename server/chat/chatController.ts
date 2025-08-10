import { Request, Response } from "express";
import { ChatService } from "./chatService";
import { ChatbotService } from "../chatbot/chatbotService";

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

    // ✅ FIXED: Don't automatically generate AI responses - just save messages
    createMessage = async (req: any, res: Response) => {
        try {
            const validatedData = req.body;

            // Always save the message first
            const message = await ChatService.createMessage(validatedData);

            // ✅ CRITICAL FIX: Only generate AI response if explicitly requested
            const shouldGenerateAIResponse = req.body.generateAIResponse === true;

            if (validatedData.isUser && shouldGenerateAIResponse) {
                // This is the old logic - only used if explicitly requested
                try {
                    console.log('🤖 Generating AI response via chat system (legacy mode)');

                    const chatbotResponse = await ChatbotService.callFlaskChatbot(
                        validatedData.content,
                        validatedData.chatSessionId
                    );

                    let aiResponseContent: string;

                    if (chatbotResponse?.success) {
                        aiResponseContent = chatbotResponse.answer || chatbotResponse.response || 'No response content';
                    } else {
                        aiResponseContent = `I'm sorry, I encountered an error: ${chatbotResponse?.error || 'Unknown error'}`;
                        console.error('❌ Chatbot error:', chatbotResponse?.error);
                    }

                    const aiResponse = await ChatService.createMessage({
                        chatSessionId: validatedData.chatSessionId,
                        content: aiResponseContent,
                        isUser: false,
                    });

                    await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
                    res.json({ userMessage: message, aiResponse });

                } catch (error) {
                    console.error("❌ Error calling Flask API:", error);

                    const fallbackResponse = await ChatService.createMessage({
                        chatSessionId: validatedData.chatSessionId,
                        content: `I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.`,
                        isUser: false,
                    });

                    await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
                    res.json({ userMessage: message, aiResponse: fallbackResponse });
                }
            } else {
                // ✅ NEW DEFAULT: Just save the message, no AI response
                console.log('💾 Saving message without generating AI response:', {
                    sessionId: validatedData.chatSessionId,
                    isUser: validatedData.isUser,
                    contentPreview: validatedData.content?.substring(0, 50) + '...'
                });

                await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
                res.json(message);
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
            res.json(messages);
        } catch (error) {
            console.error("Get messages error:", error);
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    };

    // ✅ NEW: Legacy endpoint for old-style chat with AI (if needed)
    createMessageWithAI = async (req: any, res: Response) => {
        try {
            const validatedData = { ...req.body, generateAIResponse: true };

            // Call the main createMessage method with AI generation enabled
            req.body = validatedData;
            await this.createMessage(req, res);

        } catch (error) {
            console.error("Create message with AI error:", error);
            res.status(500).json({
                message: "Failed to create message with AI",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    };
}