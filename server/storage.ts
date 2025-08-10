import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, desc, sql } from 'drizzle-orm';
import { users, chatSessions, messages, type User, type InsertUser, type ChatSession, type Message, type InsertChatSession, type InsertMessage } from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL!,
});
const db = drizzle(pool);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSessions(): Promise<ChatSession[]>;
  getChatSessionsByUserId(userId: number, limit?: number): Promise<ChatSession[]>;
  getChatSessionsByUserIdPaginated(userId: number, limit: number, offset: number): Promise<ChatSession[]>;
  getTotalSessionsByUserId(userId: number): Promise<number>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySessionId(sessionId: number): Promise<Message[]>;
  getRecentMessages(sessionId: number, limit: number): Promise<Message[]>;
  updateChatSessionTimestamp(sessionId: number): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const now = new Date();
    const sessionData = {
      ...insertSession,
      createdAt: now,
      updatedAt: now
    };

    const [session] = await db.insert(chatSessions).values(sessionData).returning();
    return session;
  }

  async getChatSessions(): Promise<ChatSession[]> {
    return await db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt));
  }

  async getChatSessionsByUserId(userId: number, limit: number = 1000): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit);
  }

  async getChatSessionsByUserIdPaginated(userId: number, limit: number, offset: number): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  async getTotalSessionsByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId));

    return parseInt(result[0].count as string);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessagesBySessionId(sessionId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatSessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async getRecentMessages(sessionId: number, limit: number = 6): Promise<Message[]> {
    return await db
      .select({
        id: messages.id,
        chatSessionId: messages.chatSessionId,
        content: messages.content,
        isUser: messages.isUser,
        createdAt: messages.createdAt
      })
      .from(messages)
      .where(eq(messages.chatSessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .then(results => results.reverse());
  }

  async updateChatSessionTimestamp(sessionId: number): Promise<void> {
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
  }
}

export const storage = new DbStorage();