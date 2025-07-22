import { storage } from "../storage";
import { insertChatSessionSchema, insertMessageSchema } from "@shared/schema";

// 👈 SIMPLIFIED: Personality types are just frontend data now
const PERSONALITY_TYPES = [
    { id: 1, name: "Analysts", code: "NT • INTP • ENTP • ENTJ", description: "Think critically and strategically, excelling in complex problem-solving and innovation." },
    { id: 2, name: "Diplomats", code: "NF • INFP • ENFP • INFJ", description: "Focus on human potential and meaningful connections, inspiring positive change." },
    { id: 3, name: "Sentinels", code: "SJ • ISTJ • ISFJ • ESTJ", description: "Value stability and order, creating reliable systems and maintaining traditions." },
    { id: 4, name: "Explorers", code: "SP • ISTP • ISFP • ESTP", description: "Embrace spontaneity and adaptability, thriving in dynamic environments." }
];

export class ChatService {
    // 👈 SIMPLIFIED: Return static data instead of database query
    static async getPersonalityTypes() {
        return PERSONALITY_TYPES;
    }

    static async createChatSession(data: any) {
        const validatedData = insertChatSessionSchema.parse(data);
        return await storage.createChatSession(validatedData);
    }

    static async getChatSessions() {
        return await storage.getChatSessions();
    }

    static async getChatSessionsByUserId(userId: number) {
        return await storage.getChatSessionsByUserId(userId);
    }

    static async createMessage(data: any) {
        const validatedData = insertMessageSchema.parse(data);
        return await storage.createMessage(validatedData);
    }

    static async getMessagesBySessionId(sessionId: number) {
        return await storage.getMessagesBySessionId(sessionId);
    }

    static async getRecentMessages(sessionId: number, limit: number = 10) {
        return await storage.getRecentMessages(sessionId, limit);
    }

    static async updateChatSessionTimestamp(sessionId: number) {
        return await storage.updateChatSessionTimestamp(sessionId);
    }
}