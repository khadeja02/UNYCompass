import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatSessionSchema, insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get personality types
  app.get("/api/personality-types", async (req, res) => {
    try {
      const types = await storage.getPersonalityTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personality types" });
    }
  });

  // Create chat session
  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Invalid chat session data" });
    }
  });

  // Get chat sessions
  app.get("/api/chat-sessions", async (req, res) => {
    try {
      const sessions = await storage.getChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  // Create message
  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      
      // Simulate AI response
      if (validatedData.isUser) {
        const aiResponse = await storage.createMessage({
          chatSessionId: validatedData.chatSessionId,
          content: "Thank you for your message. I'm here to help you find the best Hunter major that suits your personality and interests. Could you tell me more about what you're looking for?",
          isUser: false,
        });
        res.json({ userMessage: message, aiResponse });
      } else {
        res.json(message);
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Get messages by session ID
  app.get("/api/messages/:sessionId", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const messages = await storage.getMessagesBySessionId(sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
