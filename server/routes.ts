import type { Express } from "express";
import { createServer, type Server } from "http";

// Import auth modules
import { AuthService } from "./auth/authService";
import authRoutes from "./auth/authRoutes";

// Import chat routes
import chatRoutes from "./chat/chatRoutes";

// Import chatbot module
import chatbotRoutes from "./chatbot/chatbotRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize auth database - EXACT same as original
  await AuthService.createUsersTable();

  // =================================
  // AUTH ENDPOINTS - Now modular but EXACT same functionality
  // =================================
  app.use('/api/auth', authRoutes);

  // =================================
  // CHATBOT ENDPOINTS - Now modular but EXACT same functionality
  // =================================
  app.use('/api/chatbot', chatbotRoutes);

  // =================================
  // CHAT ROUTES - Moved to chat module
  // =================================
  app.use('/api', chatRoutes);

  // Health check endpoint removed - handled by serveStatic() in vite.ts
  // This prevents duplicate route conflicts

  const httpServer = createServer(app);
  return httpServer;
}