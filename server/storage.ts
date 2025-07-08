import { users, personalityTypes, chatSessions, messages, type User, type InsertUser, type PersonalityType, type ChatSession, type Message, type InsertChatSession, type InsertMessage } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPersonalityTypes(): Promise<PersonalityType[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSessions(): Promise<ChatSession[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySessionId(sessionId: number): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private personalityTypes: Map<number, PersonalityType>;
  private chatSessions: Map<number, ChatSession>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentPersonalityTypeId: number;
  private currentChatSessionId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.personalityTypes = new Map();
    this.chatSessions = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentPersonalityTypeId = 1;
    this.currentChatSessionId = 1;
    this.currentMessageId = 1;

    // Initialize personality types
    this.initializePersonalityTypes();
  }

  private initializePersonalityTypes() {
    const types = [
      { name: "Analysts", code: "NT • INTP • ENTP • ENTJ", description: "Think critically and strategically, excelling in complex problem-solving and innovation." },
      { name: "Diplomats", code: "NF • INFP • ENFP • INFJ", description: "Focus on human potential and meaningful connections, inspiring positive change." },
      { name: "Sentinels", code: "SJ • ISTJ • ISFJ • ESTJ", description: "Value stability and order, creating reliable systems and maintaining traditions." },
      { name: "Explorers", code: "SP • ISTP • ISFP • ESTP", description: "Embrace spontaneity and adaptability, thriving in dynamic environments." }
    ];

    types.forEach(type => {
      const id = this.currentPersonalityTypeId++;
      this.personalityTypes.set(id, { id, ...type });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPersonalityTypes(): Promise<PersonalityType[]> {
    return Array.from(this.personalityTypes.values());
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentChatSessionId++;
    const session: ChatSession = { 
      id, 
      userId: null, 
      personalityType: insertSession.personalityType || null,
      createdAt: new Date() 
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      id, 
      chatSessionId: insertMessage.chatSessionId || null,
      content: insertMessage.content,
      isUser: insertMessage.isUser,
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesBySessionId(sessionId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      message => message.chatSessionId === sessionId
    );
  }
}

export const storage = new MemStorage();
