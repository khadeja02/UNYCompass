import { storage } from "../storage";
import { insertChatSessionSchema, insertMessageSchema } from "@shared/schema";

const PERSONALITY_TYPES = [
    { id: 1, name: "Analysts", code: "NT • INTP • ENTP • ENTJ", description: "Think critically and strategically, excelling in complex problem-solving and innovation." },
    { id: 2, name: "Diplomats", code: "NF • INFP • ENFP • INFJ", description: "Focus on human potential and meaningful connections, inspiring positive change." },
    { id: 3, name: "Sentinels", code: "SJ • ISTJ • ISFJ • ESTJ", description: "Value stability and order, creating reliable systems and maintaining traditions." },
    { id: 4, name: "Explorers", code: "SP • ISTP • ISFP • ESTP", description: "Embrace spontaneity and adaptability, thriving in dynamic environments." }
];

export class ChatService {
    static async getPersonalityTypes() {
        return PERSONALITY_TYPES;
    }

    static async createChatSession(data: any) {
        try {
            const validatedData = insertChatSessionSchema.parse(data);

            if (!validatedData.userId) {
                throw new Error('userId is required for chat session creation');
            }

            const result = await storage.createChatSession(validatedData);
            return result;
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('validation')) {
                    throw new Error(`Validation failed: ${error.message}`);
                }
                if (error.message.includes('database') || error.message.includes('connection')) {
                    throw new Error(`Database error: ${error.message}`);
                }
                throw error;
            }

            throw new Error('Unknown error during chat session creation');
        }
    }

    static async getChatSessions() {
        try {
            return await storage.getChatSessions();
        } catch (error) {
            throw new Error('Failed to fetch chat sessions');
        }
    }

    static async getChatSessionsByUserId(userId: number, limit?: number, offset?: number) {
        try {
            if (!userId) {
                throw new Error('userId is required');
            }

            if (limit !== undefined && offset !== undefined) {
                return await storage.getChatSessionsByUserIdPaginated(userId, limit, offset);
            }

            return await storage.getChatSessionsByUserId(userId, limit);
        } catch (error) {
            throw new Error('Failed to fetch user chat sessions');
        }
    }

    static async getTotalSessionsByUserId(userId: number) {
        try {
            if (!userId) {
                throw new Error('userId is required');
            }

            return await storage.getTotalSessionsByUserId(userId);
        } catch (error) {
            throw new Error('Failed to get total sessions count');
        }
    }

    static async createMessage(data: any) {
        try {
            const validatedData = insertMessageSchema.parse(data);

            if (!validatedData.chatSessionId) {
                throw new Error('chatSessionId is required for message creation');
            }
            if (!validatedData.content || validatedData.content.trim() === '') {
                throw new Error('content is required and cannot be empty');
            }
            if (typeof validatedData.isUser !== 'boolean') {
                throw new Error('isUser must be a boolean value');
            }

            const result = await storage.createMessage(validatedData);
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }

            throw new Error('Unknown error during message creation');
        }
    }

    static async getMessagesBySessionId(sessionId: number) {
        try {
            if (!sessionId) {
                throw new Error('sessionId is required');
            }

            const result = await storage.getMessagesBySessionId(sessionId);
            return result;
        } catch (error) {
            throw new Error('Failed to fetch session messages');
        }
    }

    static async getRecentMessages(sessionId: number, limit: number = 10) {
        try {
            if (!sessionId) {
                throw new Error('sessionId is required');
            }

            const result = await storage.getRecentMessages(sessionId, limit);
            return result;
        } catch (error) {
            throw new Error('Failed to fetch recent messages');
        }
    }

    static async updateChatSessionTimestamp(sessionId: number) {
        try {
            if (!sessionId) {
                throw new Error('sessionId is required');
            }

            await storage.updateChatSessionTimestamp(sessionId);
        } catch (error) {
            throw new Error('Failed to update session timestamp');
        }
    }
}