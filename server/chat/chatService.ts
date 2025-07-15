import { storage } from "../storage";
import { insertChatSessionSchema, insertMessageSchema } from "@shared/schema";

export class ChatService {
    static async getPersonalityTypes() {
        return await storage.getPersonalityTypes();
    }

    static async createChatSession(data: any) {
        const validatedData = insertChatSessionSchema.parse(data);
        return await storage.createChatSession(validatedData);
    }

    static async getChatSessions() {
        return await storage.getChatSessions();
    }

    static async createMessage(data: any) {
        const validatedData = insertMessageSchema.parse(data);
        return await storage.createMessage(validatedData);
    }

    static async getMessagesBySessionId(sessionId: number) {
        return await storage.getMessagesBySessionId(sessionId);
    }
}