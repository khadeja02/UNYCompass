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
    }

    // 👈 UPDATED: Create session for authenticated user
    createChatSession = async (req: any, res: Response) => {
        try {
            // Extract user ID from authenticated request
            const sessionData = {
                ...req.body,
                userId: req.user.userId // 👈 Add user ID from auth middleware
            };

            const session = await ChatService.createChatSession(sessionData);
            res.json(session);
        } catch (error) {
            console.error('Create chat session error:', error);
            res.status(400).json({ message: "Invalid chat session data" });
        }
    }

    // 👈 UPDATED: Get sessions for authenticated user only
    getChatSessions = async (req: any, res: Response) => {
        try {
            const sessions = await ChatService.getChatSessionsByUserId(req.user.userId);
            res.json(sessions);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch chat sessions" });
        }
    }

    // 👈 UPDATED: Add conversation context for continuity
    createMessage = async (req: any, res: Response) => {
        try {
            const validatedData = req.body;
            const message = await ChatService.createMessage(validatedData);

            // Generate AI response using Hunter chatbot with conversation context
            if (validatedData.isUser) {
                let aiResponseContent;

                try {
                    // 👈 NEW: Get conversation context
                    const recentMessages = await ChatService.getRecentMessages(
                        validatedData.chatSessionId,
                        8 // Last 8 messages for context
                    );

                    // 👈 NEW: Build context string (exclude the current message since it's not saved yet)
                    const contextString = recentMessages.length > 0
                        ? recentMessages.map(msg =>
                            `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`
                        ).join('\n') + '\n\n'
                        : '';

                    // 👈 NEW: Send context + new message to AI
                    const fullPrompt = `${contextString}User: ${validatedData.content}`;

                    console.log('Sending to AI with context:', fullPrompt);

                    const chatbotResponse = await ChatbotService.callFlaskChatbot(fullPrompt);

                    if ((chatbotResponse as any).success) {
                        aiResponseContent = (chatbotResponse as any).answer;
                    } else {
                        aiResponseContent = "I'm having trouble accessing the Hunter College information right now. Please try asking about specific programs or requirements.";
                    }
                } catch (error) {
                    console.error('Chatbot error in messages endpoint:', error);
                    aiResponseContent = "I'm here to help you find information about Hunter College programs. What would you like to know about?";
                }

                const aiResponse = await ChatService.createMessage({
                    chatSessionId: validatedData.chatSessionId,
                    content: aiResponseContent,
                    isUser: false,
                });

                // 👈 NEW: Update chat session timestamp
                await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);

                res.json({ userMessage: message, aiResponse });
            } else {
                res.json(message);
            }
        } catch (error) {
            console.error('Create message error:', error);
            res.status(400).json({ message: "Invalid message data" });
        }
    }

    // 👈 UPDATED: Add user verification (optional security)
    getMessagesBySessionId = async (req: any, res: Response) => {
        try {
            const sessionId = parseInt(req.params.sessionId);

            // Optional: Verify user owns this chat session
            const userSessions = await ChatService.getChatSessionsByUserId(req.user.userId);
            const sessionExists = userSessions.some(session => session.id === sessionId);

            if (!sessionExists) {
                return res.status(403).json({ message: "Access denied to this chat session" });
            }

            const messages = await ChatService.getMessagesBySessionId(sessionId);
            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    }
}