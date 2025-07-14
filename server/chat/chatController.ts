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

    createChatSession = async (req: Request, res: Response) => {
        try {
            const session = await ChatService.createChatSession(req.body);
            res.json(session);
        } catch (error) {
            res.status(400).json({ message: "Invalid chat session data" });
        }
    }

    getChatSessions = async (req: Request, res: Response) => {
        try {
            const sessions = await ChatService.getChatSessions();
            res.json(sessions);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch chat sessions" });
        }
    }

    createMessage = async (req: Request, res: Response) => {
        try {
            const validatedData = req.body;
            const message = await ChatService.createMessage(validatedData);

            // Generate AI response using Hunter chatbot - EXACT same logic as original
            if (validatedData.isUser) {
                let aiResponseContent;

                try {
                    // Use the ChatbotService instead of the injected function
                    const chatbotResponse = await ChatbotService.callPythonChatbot(validatedData.content);

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

                res.json({ userMessage: message, aiResponse });
            } else {
                res.json(message);
            }
        } catch (error) {
            res.status(400).json({ message: "Invalid message data" });
        }
    }

    getMessagesBySessionId = async (req: Request, res: Response) => {
        try {
            const sessionId = parseInt(req.params.sessionId);
            const messages = await ChatService.getMessagesBySessionId(sessionId);
            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch messages" });
        }
    }
}