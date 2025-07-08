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
      { name: "Analysts", code: "NT • INTP • ENTP • ENTJ", description: "Rational and impartial, they excel at intellectual debates and scientific or technological fields." },
      { name: "Diplomats", code: "NF • INFP • ENFP • INFJ", description: "Warm and empathetic, they help and inspire others while working toward personal growth and greater good." },
      { name: "Sentinels", code: "SJ • ISTJ • ISFJ • ESTJ", description: "Practical and fact-minded, they are reliable and strive to uphold traditions and order." },
      { name: "Explorers", code: "SP • ISTP • ISFP • ESTP", description: "Spontaneous and flexible, they tend to be resourceful and focus on making things happen." }
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
      ...insertSession, 
      id, 
      userId: null, 
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
      ...insertMessage, 
      id, 
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
