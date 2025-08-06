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

    createMessage = async (req: any, res: Response) => {
        try {
            const validatedData = req.body;

            const userMessage = await ChatService.createMessage(validatedData);

            if (validatedData.isUser) {
                try {
                    const recentMessages = await ChatService.getRecentMessages(
                        validatedData.chatSessionId,
                        8
                    );

                    const contextString = recentMessages.length > 0
                        ? recentMessages
                            .map(msg => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
                            .join("\n") + "\n\n"
                        : "";

                    const fullPrompt = `${contextString}User: ${validatedData.content}`;

                    console.log('🔍 DEBUG: About to call ChatbotService.callFlaskChatbot');
                    console.log('🔍 DEBUG: Full prompt length:', fullPrompt.length);
                    console.log('🔍 DEBUG: Full prompt preview:', fullPrompt.substring(0, 200) + '...');

                    const chatbotResponse = await ChatbotService.callFlaskChatbot(fullPrompt);

                    // 🔍 EXTENSIVE DEBUGGING
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

                    const aiResponse = await ChatService.createMessage({
                        chatSessionId: validatedData.chatSessionId,
                        content: aiResponseContent,
                        isUser: false,
                    });

                    await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
                    res.json({ userMessage, aiResponse });

                } catch (error) {
                    console.error("🔍 DEBUG: Caught error in try/catch:");
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
            res.json(messages);
        } catch (error) {
            console.error("Get messages error:", error);
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    };
}