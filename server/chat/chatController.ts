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
            const sessions = await ChatService.getChatSessionsByUserId(req.user.userId);
            res.json(sessions);
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

                    const chatbotResponse = await ChatbotService.callFlaskChatbot(fullPrompt);

                    const aiResponseContent = chatbotResponse?.success
                        ? chatbotResponse.answer || chatbotResponse.response
                        : "I'm having trouble accessing the Hunter College information right now. Please try asking about specific programs or requirements.";

                    const aiResponse = await ChatService.createMessage({
                        chatSessionId: validatedData.chatSessionId,
                        content: aiResponseContent,
                        isUser: false,
                    });

                    await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);

                    res.json({ userMessage, aiResponse });

                } catch (error) {
                    console.error("AI processing error:", error);

                    const fallbackResponse = await ChatService.createMessage({
                        chatSessionId: validatedData.chatSessionId,
                        content: "I'm here to help you find information about Hunter College programs. What would you like to know about?",
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
