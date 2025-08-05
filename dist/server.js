var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// vite.config.ts
var vite_config_exports = {};
__export(vite_config_exports, {
  default: () => vite_config_default
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default;
var init_vite_config = __esm({
  async "vite.config.ts"() {
    "use strict";
    vite_config_default = defineConfig({
      plugins: [
        react(),
        runtimeErrorOverlay(),
        ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
          await import("@replit/vite-plugin-cartographer").then(
            (m) => m.cartographer()
          )
        ] : []
      ],
      resolve: {
        alias: {
          "@": path.resolve(import.meta.dirname, "client", "src"),
          "@shared": path.resolve(import.meta.dirname, "shared"),
          "@assets": path.resolve(import.meta.dirname, "attached_assets")
        }
      },
      root: path.resolve(import.meta.dirname, "client"),
      build: {
        outDir: path.resolve(import.meta.dirname, "dist/public"),
        emptyOutDir: true
      },
      server: {
        fs: {
          strict: true,
          deny: ["**/.*"]
        },
        proxy: {
          "/api": {
            target: "http://localhost:3000",
            changeOrigin: true,
            secure: false
          }
        }
      }
    });
  }
});

// server/index.ts
import express from "express";
import { config as config2 } from "dotenv";

// server/routes.ts
import { createServer } from "http";

// server/auth/authService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";
import { config } from "dotenv";
var { Pool } = pkg;
config();
var pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
var JWT_SECRET = process.env.JWT_SECRET;
var AuthService = class _AuthService {
  static {
    __name(this, "AuthService");
  }
  // Test database connection - EXACT same as original
  static async testConnection() {
    try {
      console.log("Testing database connection...");
      console.log("Connection string:", process.env.DATABASE_PUBLIC_URL?.replace(/:[^:]*@/, ":****@"));
      const client = await pool.connect();
      console.log("\u2705 Database connected successfully!");
      const result = await client.query("SELECT NOW()");
      console.log("\u2705 Query test successful:", result.rows[0]);
      client.release();
      return true;
    } catch (err) {
      console.error("\u274C Database connection failed:", err);
      return false;
    }
  }
  // Initialize users table - EXACT same as original
  static async createUsersTable() {
    const isConnected = await _AuthService.testConnection();
    if (!isConnected) {
      console.error("\u274C Skipping table creation due to connection failure");
      return;
    }
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("\u2705 Users table created or already exists");
    } catch (err) {
      console.error("\u274C Error creating users table:", err);
    }
  }
  // Register new user - EXACT same logic as original
  static async register(username, email, password) {
    if (!username || !email || !password) {
      throw new Error("Username, email, and password are required");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existingUser.rows.length > 0) {
      throw new Error("Username or email already exists");
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, passwordHash]
    );
    const newUser = result.rows[0];
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    return { user: newUser, token };
  }
  // Login user - EXACT same logic as original
  static async login(username, password) {
    if (!username || !password) {
      throw new Error("Username and password are required");
    }
    const result = await pool.query(
      "SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1",
      [username]
    );
    if (result.rows.length === 0) {
      throw new Error("Invalid credentials");
    }
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    return { user: { id: user.id, username: user.username, email: user.email }, token };
  }
  // Get user by ID - EXACT same logic as original
  static async getUserById(userId) {
    const result = await pool.query(
      "SELECT id, username, email, created_at FROM users WHERE id = $1",
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  // Update user profile - EXACT same logic as original
  static async updateProfile(userId, email) {
    if (!email) {
      throw new Error("Email is required");
    }
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [email, userId]
    );
    if (existingUser.rows.length > 0) {
      throw new Error("Email already in use");
    }
    const result = await pool.query(
      "UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, updated_at",
      [email, userId]
    );
    return result.rows[0];
  }
  // Update password - EXACT same logic as original
  static async updatePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required");
    }
    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newPasswordHash, userId]
    );
  }
  // Verify JWT token - EXACT same logic as original
  static verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }
};

// server/auth/authRoutes.ts
import { Router } from "express";

// server/auth/authMiddleware.ts
var authenticateToken = /* @__PURE__ */ __name((req, res, next) => {
  console.log("\u{1F510} Auth middleware called for:", req.method, req.path);
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    console.log("\u274C No token provided");
    return res.status(401).json({ error: "Access token required" });
  }
  try {
    const decoded = AuthService.verifyToken(token);
    console.log("\u2705 Token verified for user:", decoded.userId, decoded.username);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("\u274C Token verification failed:", err.message);
    if (err.name === "TokenExpiredError") {
      console.log("\u{1F552} Token expired at:", err.expiredAt);
      return res.status(401).json({
        error: "Token expired",
        expiredAt: err.expiredAt,
        code: "TOKEN_EXPIRED"
      });
    } else if (err.name === "JsonWebTokenError") {
      console.log("\u{1F512} Invalid token format");
      return res.status(401).json({
        error: "Invalid token format",
        code: "INVALID_TOKEN"
      });
    } else {
      console.log("\u{1F6A8} Unknown token error:", err);
      return res.status(403).json({
        error: "Token verification failed",
        code: "VERIFICATION_FAILED"
      });
    }
  }
}, "authenticateToken");

// server/auth/authRoutes.ts
var router = Router();
router.post("/register", async (req, res) => {
  try {
    console.error("\u{1F50D} REGISTER DEBUG - req.body:", req.body);
    console.error("\u{1F50D} REGISTER DEBUG - content-type:", req.headers["content-type"]);
    const { username, email, password } = req.body;
    const { user, token } = await AuthService.register(username, email, password);
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      },
      token
    });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.message === "Username, email, and password are required") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Password must be at least 6 characters long") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Username or email already exists") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    console.error("\u{1F50D} LOGIN DEBUG START ================================");
    console.error("\u{1F50D} LOGIN DEBUG - req.body:", req.body);
    console.error("\u{1F50D} LOGIN DEBUG - req.body type:", typeof req.body);
    console.error("\u{1F50D} LOGIN DEBUG - req.body keys:", Object.keys(req.body || {}));
    console.error("\u{1F50D} LOGIN DEBUG - req.headers:", req.headers);
    console.error("\u{1F50D} LOGIN DEBUG - content-type:", req.headers["content-type"]);
    console.error("\u{1F50D} LOGIN DEBUG - req.method:", req.method);
    console.error("\u{1F50D} LOGIN DEBUG - req.path:", req.path);
    console.error("\u{1F50D} LOGIN DEBUG - req.url:", req.url);
    console.error("\u{1F50D} LOGIN DEBUG - JSON.stringify(req.body):", JSON.stringify(req.body));
    console.error("\u{1F50D} LOGIN DEBUG END ==================================");
    if (!req.body || typeof req.body !== "object") {
      console.error("\u274C LOGIN ERROR - req.body is not an object:", req.body);
      return res.status(400).json({ error: "Invalid request body" });
    }
    const { username, password } = req.body;
    console.error("\u{1F50D} LOGIN DEBUG - Extracted username:", username);
    console.error("\u{1F50D} LOGIN DEBUG - Extracted password:", password ? "[HIDDEN]" : "undefined");
    if (!username || !password) {
      console.error("\u274C LOGIN ERROR - Missing username or password");
      return res.status(400).json({ error: "Username and password are required" });
    }
    console.error("\u2705 LOGIN DEBUG - Calling AuthService.login...");
    const { user, token } = await AuthService.login(username, password);
    console.error("\u2705 LOGIN DEBUG - AuthService.login successful");
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (err) {
    console.error("\u274C Login error:", err);
    console.error("\u274C Login error stack:", err.stack);
    if (err.message === "Username and password are required") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Invalid credentials") {
      return res.status(401).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/test", (req, res) => {
  console.error("\u{1F9EA} TEST ENDPOINT - req.body:", req.body);
  console.error("\u{1F9EA} TEST ENDPOINT - content-type:", req.headers["content-type"]);
  console.error("\u{1F9EA} TEST ENDPOINT - headers:", req.headers);
  res.json({
    message: "Test endpoint reached",
    body: req.body,
    headers: req.headers,
    contentType: req.headers["content-type"]
  });
});
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await AuthService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    const updatedUser = await AuthService.updateProfile(req.user.userId, email);
    res.json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error("Profile update error:", err);
    if (err.message === "Email is required") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "Email already in use") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
router.put("/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.updatePassword(req.user.userId, currentPassword, newPassword);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    if (err.message === "Current password and new password are required") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "New password must be at least 6 characters long") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "Current password is incorrect") {
      return res.status(401).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logout successful" });
});
var authRoutes_default = router;

// server/chat/chatRoutes.ts
import { Router as Router2 } from "express";

// server/storage.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool as Pool2 } from "pg";
import { eq, desc, sql } from "drizzle-orm";

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});
var chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatSessionId: integer("chat_session_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password_hash: true
});
var insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  userId: true,
  title: true
});
var insertMessageSchema = createInsertSchema(messages).pick({
  chatSessionId: true,
  content: true,
  isUser: true
});

// server/storage.ts
var pool2 = new Pool2({
  connectionString: process.env.DATABASE_PUBLIC_URL
});
var db = drizzle(pool2);
var DbStorage = class {
  static {
    __name(this, "DbStorage");
  }
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async createChatSession(insertSession) {
    const now = /* @__PURE__ */ new Date();
    const sessionData = {
      ...insertSession,
      createdAt: now,
      updatedAt: now
    };
    const [session] = await db.insert(chatSessions).values(sessionData).returning();
    return session;
  }
  async getChatSessions() {
    return await db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt));
  }
  async getChatSessionsByUserId(userId, limit = 1e3) {
    return await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.updatedAt)).limit(limit);
  }
  async getChatSessionsByUserIdPaginated(userId, limit, offset) {
    return await db.select().from(chatSessions).where(eq(chatSessions.userId, userId)).orderBy(desc(chatSessions.updatedAt)).limit(limit).offset(offset);
  }
  async getTotalSessionsByUserId(userId) {
    const result = await db.select({ count: sql`count(*)` }).from(chatSessions).where(eq(chatSessions.userId, userId));
    return parseInt(result[0].count);
  }
  async createMessage(insertMessage) {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }
  async getMessagesBySessionId(sessionId) {
    return await db.select().from(messages).where(eq(messages.chatSessionId, sessionId)).orderBy(messages.createdAt);
  }
  async getRecentMessages(sessionId, limit) {
    return await db.select().from(messages).where(eq(messages.chatSessionId, sessionId)).orderBy(desc(messages.createdAt)).limit(limit).then((results) => results.reverse());
  }
  async updateChatSessionTimestamp(sessionId) {
    await db.update(chatSessions).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(chatSessions.id, sessionId));
  }
};
var storage = new DbStorage();

// server/chat/chatService.ts
var PERSONALITY_TYPES = [
  { id: 1, name: "Analysts", code: "NT \u2022 INTP \u2022 ENTP \u2022 ENTJ", description: "Think critically and strategically, excelling in complex problem-solving and innovation." },
  { id: 2, name: "Diplomats", code: "NF \u2022 INFP \u2022 ENFP \u2022 INFJ", description: "Focus on human potential and meaningful connections, inspiring positive change." },
  { id: 3, name: "Sentinels", code: "SJ \u2022 ISTJ \u2022 ISFJ \u2022 ESTJ", description: "Value stability and order, creating reliable systems and maintaining traditions." },
  { id: 4, name: "Explorers", code: "SP \u2022 ISTP \u2022 ISFP \u2022 ESTP", description: "Embrace spontaneity and adaptability, thriving in dynamic environments." }
];
var ChatService = class {
  static {
    __name(this, "ChatService");
  }
  static async getPersonalityTypes() {
    return PERSONALITY_TYPES;
  }
  static async createChatSession(data) {
    try {
      const validatedData = insertChatSessionSchema.parse(data);
      if (!validatedData.userId) {
        throw new Error("userId is required for chat session creation");
      }
      const result = await storage.createChatSession(validatedData);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("validation")) {
          throw new Error(`Validation failed: ${error.message}`);
        }
        if (error.message.includes("database") || error.message.includes("connection")) {
          throw new Error(`Database error: ${error.message}`);
        }
        throw error;
      }
      throw new Error("Unknown error during chat session creation");
    }
  }
  static async getChatSessions() {
    try {
      return await storage.getChatSessions();
    } catch (error) {
      throw new Error("Failed to fetch chat sessions");
    }
  }
  static async getChatSessionsByUserId(userId, limit, offset) {
    try {
      if (!userId) {
        throw new Error("userId is required");
      }
      if (limit !== void 0 && offset !== void 0) {
        return await storage.getChatSessionsByUserIdPaginated(userId, limit, offset);
      }
      return await storage.getChatSessionsByUserId(userId, limit);
    } catch (error) {
      throw new Error("Failed to fetch user chat sessions");
    }
  }
  static async getTotalSessionsByUserId(userId) {
    try {
      if (!userId) {
        throw new Error("userId is required");
      }
      return await storage.getTotalSessionsByUserId(userId);
    } catch (error) {
      throw new Error("Failed to get total sessions count");
    }
  }
  static async createMessage(data) {
    try {
      const validatedData = insertMessageSchema.parse(data);
      if (!validatedData.chatSessionId) {
        throw new Error("chatSessionId is required for message creation");
      }
      if (!validatedData.content || validatedData.content.trim() === "") {
        throw new Error("content is required and cannot be empty");
      }
      if (typeof validatedData.isUser !== "boolean") {
        throw new Error("isUser must be a boolean value");
      }
      const result = await storage.createMessage(validatedData);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error during message creation");
    }
  }
  static async getMessagesBySessionId(sessionId) {
    try {
      if (!sessionId) {
        throw new Error("sessionId is required");
      }
      const result = await storage.getMessagesBySessionId(sessionId);
      return result;
    } catch (error) {
      throw new Error("Failed to fetch session messages");
    }
  }
  static async getRecentMessages(sessionId, limit = 10) {
    try {
      if (!sessionId) {
        throw new Error("sessionId is required");
      }
      const result = await storage.getRecentMessages(sessionId, limit);
      return result;
    } catch (error) {
      throw new Error("Failed to fetch recent messages");
    }
  }
  static async updateChatSessionTimestamp(sessionId) {
    try {
      if (!sessionId) {
        throw new Error("sessionId is required");
      }
      await storage.updateChatSessionTimestamp(sessionId);
    } catch (error) {
      throw new Error("Failed to update session timestamp");
    }
  }
};

// server/chatbot/chatbotService.ts
import axios from "axios";
var ChatbotService = class {
  static {
    __name(this, "ChatbotService");
  }
  static FLASK_API_URL = process.env.FLASK_API_URL || "https://unycompass-production.up.railway.app";
  static {
    console.log("\u{1F50D} Debug Info:");
    console.log("\u{1F50D} process.env.FLASK_API_URL:", process.env.FLASK_API_URL);
    console.log("\u{1F50D} Final FLASK_API_URL:", this.FLASK_API_URL);
    console.log("\u{1F50D} All env vars:", Object.keys(process.env).filter((k) => k.includes("FLASK")));
  }
  static async callFlaskChatbot(question, personalityType) {
    try {
      let contextualQuestion = question;
      if (personalityType && personalityType !== "chatbot" && personalityType !== "unknown") {
        contextualQuestion = `I am a ${personalityType.toUpperCase()} personality type. ${question}`;
      }
      console.log(`\u{1F310} Calling Flask API: ${this.FLASK_API_URL}/chat`);
      console.log(`\u{1F4DD} Question to send: ${contextualQuestion.substring(0, 100)}...`);
      const response = await axios.post(`${this.FLASK_API_URL}/chat`, {
        message: contextualQuestion
      }, {
        timeout: 3e4,
        headers: { "Content-Type": "application/json" }
      });
      console.log("\u2705 Flask API response received:", response.data);
      return {
        success: true,
        question: response.data.question,
        answer: response.data.response,
        response: response.data.response,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error("\u274C Flask API error:", error);
      let errorMessage = "Failed to connect to chatbot service";
      if (error.response) {
        console.error("\u274C Server error response:", error.response.data);
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        console.error("\u274C No response received:", error.request);
        errorMessage = "No response from chatbot service. Make sure Flask API is running on port 5001.";
      } else {
        console.error("\u274C Request setup error:", error.message);
        errorMessage = error.message || "Unknown error occurred";
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  static async askQuestion(question, personalityType) {
    return await this.callFlaskChatbot(question, personalityType);
  }
  static async checkStatus() {
    try {
      console.log(`\u{1F50D} Checking Flask API status: ${this.FLASK_API_URL}/status`);
      const response = await axios.get(`${this.FLASK_API_URL}/status`, {
        timeout: 1e4
      });
      console.log("\u2705 Status check response:", response.data);
      return {
        success: true,
        status: response.data.status,
        message: "Flask API is ready"
      };
    } catch (error) {
      console.error("\u274C Status check error:", error);
      let errorMessage = "Flask API is offline";
      if (error.code === "ECONNREFUSED") {
        errorMessage = "Flask API is not running. Please start the Flask server on port 5001.";
      } else if (error.code === "ENOTFOUND") {
        errorMessage = "Cannot reach Flask API. Check if it's running on localhost:5001.";
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  }
};

// server/chat/chatController.ts
var ChatController = class {
  static {
    __name(this, "ChatController");
  }
  getPersonalityTypes = /* @__PURE__ */ __name(async (req, res) => {
    try {
      const types = await ChatService.getPersonalityTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personality types" });
    }
  }, "getPersonalityTypes");
  createChatSession = /* @__PURE__ */ __name(async (req, res) => {
    try {
      if (!req.user || !req.user.userId) {
        console.error("No authenticated user found");
        return res.status(401).json({
          message: "Authentication required",
          error: "No user found in request"
        });
      }
      const sessionData = {
        ...req.body,
        userId: req.user.userId
      };
      const session = await ChatService.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Create chat session error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorDetails = error instanceof Error ? error.stack : error;
      res.status(500).json({
        message: "Failed to create chat session",
        error: errorMessage,
        details: errorDetails
      });
    }
  }, "createChatSession");
  getChatSessions = /* @__PURE__ */ __name(async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const totalSessions = await ChatService.getTotalSessionsByUserId(req.user.userId);
      const sessions = await ChatService.getChatSessionsByUserId(req.user.userId, limit, offset);
      res.json({
        sessions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSessions / limit),
          totalSessions,
          hasMore: page * limit < totalSessions
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  }, "getChatSessions");
  createMessage = /* @__PURE__ */ __name(async (req, res) => {
    try {
      const validatedData = req.body;
      const userMessage = await ChatService.createMessage(validatedData);
      if (validatedData.isUser) {
        try {
          const recentMessages = await ChatService.getRecentMessages(
            validatedData.chatSessionId,
            8
          );
          const contextString = recentMessages.length > 0 ? recentMessages.map((msg) => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`).join("\n") + "\n\n" : "";
          const fullPrompt = `${contextString}User: ${validatedData.content}`;
          const chatbotResponse = await ChatbotService.callFlaskChatbot(fullPrompt);
          const aiResponseContent = chatbotResponse?.success ? chatbotResponse.answer || chatbotResponse.response : "I'm having trouble accessing the Hunter College information right now. Please try asking about specific programs or requirements.";
          const aiResponse = await ChatService.createMessage({
            chatSessionId: validatedData.chatSessionId,
            content: aiResponseContent,
            isUser: false
          });
          await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
          res.json({ userMessage, aiResponse });
        } catch (error) {
          console.error("AI processing error:", error);
          const fallbackResponse = await ChatService.createMessage({
            chatSessionId: validatedData.chatSessionId,
            content: "I'm here to help you find information about Hunter College programs. What would you like to know about?",
            isUser: false
          });
          await ChatService.updateChatSessionTimestamp(validatedData.chatSessionId);
          res.json({ userMessage, aiResponse: fallbackResponse });
        }
      } else {
        res.json(userMessage);
      }
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({
        message: "Failed to create message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, "createMessage");
  getMessagesBySessionId = /* @__PURE__ */ __name(async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const userSessions = await ChatService.getChatSessionsByUserId(req.user.userId);
      const sessionExists = userSessions.some((session) => session.id === sessionId);
      if (!sessionExists) {
        console.warn("Access denied to session:", sessionId);
        return res.status(403).json({ message: "Access denied to this chat session" });
      }
      const messages2 = await ChatService.getMessagesBySessionId(sessionId);
      res.json(messages2);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  }, "getMessagesBySessionId");
};

// server/chat/chatRoutes.ts
var router2 = Router2();
var chatController = new ChatController();
router2.get("/personality-types", chatController.getPersonalityTypes);
router2.post("/chat-sessions", authenticateToken, chatController.createChatSession);
router2.get("/chat-sessions", authenticateToken, chatController.getChatSessions);
router2.post("/messages", authenticateToken, chatController.createMessage);
router2.get("/messages/:sessionId", authenticateToken, chatController.getMessagesBySessionId);
var chatRoutes_default = router2;

// server/chatbot/chatbotRoutes.ts
import { Router as Router3 } from "express";

// server/chatbot/chatbotController.ts
var ChatbotController = class {
  static {
    __name(this, "ChatbotController");
  }
  static async ask(req, res) {
    try {
      const { question, personalityType } = req.body;
      if (!question || !question.trim()) {
        return res.status(400).json({
          success: false,
          error: "Question is required"
        });
      }
      console.log(`User ${req.user.username} (${personalityType || "no personality"}) asked: ${question}`);
      const response = await ChatbotService.askQuestion(question, personalityType);
      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: "Chatbot error",
          details: response.error
        });
      }
      res.json({
        success: true,
        question: response.question,
        answer: response.answer,
        user: req.user.username,
        personalityType: personalityType || null,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Chatbot API error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error.message
      });
    }
  }
  static async status(req, res) {
    try {
      console.log("Checking chatbot status...");
      const testResponse = await ChatbotService.checkStatus();
      console.log("Status check response:", testResponse);
      const isWorking = testResponse.success;
      res.json({
        status: isWorking ? "online" : "offline",
        pythonWorking: isWorking,
        message: isWorking ? "Chatbot is ready" : testResponse.error || "Chatbot unavailable"
      });
    } catch (error) {
      console.error("Status check error:", error);
      res.json({
        status: "offline",
        pythonWorking: false,
        message: error.message
      });
    }
  }
};

// server/chatbot/chatbotRoutes.ts
var router3 = Router3();
router3.post("/ask", authenticateToken, ChatbotController.ask);
router3.get("/status", authenticateToken, ChatbotController.status);
var chatbotRoutes_default = router3;

// server/routes.ts
async function registerRoutes(app2) {
  await AuthService.createUsersTable();
  app2.use("/api/auth", authRoutes_default);
  app2.use("/api/chatbot", chatbotRoutes_default);
  app2.use("/api", chatRoutes_default);
  const httpServer = createServer(app2);
  return httpServer;
}
__name(registerRoutes, "registerRoutes");

// server/vite.ts
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
__name(log, "log");
async function setupVite(app2, server) {
  if (process.env.NODE_ENV !== "development") {
    log("\u26A0\uFE0F  Vite setup skipped - production environment");
    return;
  }
  try {
    const viteConfigPath = path2.resolve(__dirname, "..", "vite.config.ts");
    const hasViteConfig = fs.existsSync(viteConfigPath);
    if (!hasViteConfig) {
      log("\u26A0\uFE0F  Vite config not found - skipping Vite dev setup");
      return;
    }
    const viteConfigModule = await init_vite_config().then(() => vite_config_exports);
    const viteConfig = viteConfigModule.default;
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true
    };
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: /* @__PURE__ */ __name((msg, options) => {
          viteLogger.error(msg, options);
          process.exit(1);
        }, "error")
      },
      server: serverOptions,
      appType: "custom"
    });
    app2.use(vite.middlewares);
    app2.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const clientTemplate = path2.resolve(
          __dirname,
          "..",
          "client",
          "index.html"
        );
        if (!fs.existsSync(clientTemplate)) {
          log(`\u26A0\uFE0F  Client template not found: ${clientTemplate}`);
          return next();
        }
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
    log("\u2705 Vite dev server setup complete");
  } catch (error) {
    log(`\u26A0\uFE0F  Could not setup Vite dev server: ${error}`);
  }
}
__name(setupVite, "setupVite");
function serveStatic(app2) {
  log("\u{1F4C1} Backend-only deployment - static files handled by Vercel");
  app2.get("/", (req, res) => {
    res.json({
      message: "UNYCompass Auth API Server",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "running"
    });
  });
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "auth-backend",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: !!process.env.DATABASE_PUBLIC_URL ? "configured" : "missing",
      jwt: !!process.env.JWT_SECRET ? "configured" : "missing"
    });
  });
  app2.use("*", (req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `Route ${req.originalUrl} not found`,
      availableEndpoints: [
        "GET /",
        "GET /api/health",
        "POST /api/auth/login",
        "POST /api/auth/register",
        "GET /api/auth/me"
      ]
    });
  });
}
__name(serveStatic, "serveStatic");

// server/index.ts
console.log("\u{1F6A8}\u{1F6A8}\u{1F6A8} RAILWAY UPDATE TEST v5.0 \u{1F6A8}\u{1F6A8}\u{1F6A8}");
config2();
console.log("\u{1F527} Environment check:");
console.log("  JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("  DATABASE_URL exists:", !!process.env.DATABASE_PUBLIC_URL);
var app = express();
console.log("\u{1F527} Setting up express.json() middleware");
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  if (req.path.includes("/api/auth") && req.method === "POST") {
    console.error("\u{1F527} MIDDLEWARE DEBUG - Path:", req.path);
    console.error("\u{1F527} MIDDLEWARE DEBUG - Method:", req.method);
    console.error("\u{1F527} MIDDLEWARE DEBUG - Body parsed:", !!req.body);
    console.error("\u{1F527} MIDDLEWARE DEBUG - Body content:", req.body);
    console.error("\u{1F527} MIDDLEWARE DEBUG - Content-Type:", req.headers["content-type"]);
  }
  next();
});
console.log("\u{1F527} Setting up CORS middleware");
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.error("\u{1F310} CORS - Processing request:", req.method, req.path, "from origin:", origin);
  const allowedOrigins = [
    "http://localhost:3000",
    "https://unycompass.vercel.app"
  ];
  const isAllowed = !origin || allowedOrigins.includes(origin) || origin.includes("unycompass") && origin.includes(".vercel.app");
  if (isAllowed && origin) {
    res.header("Access-Control-Allow-Origin", origin);
    console.error("\u2705 CORS - Origin allowed:", origin);
  } else if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
    console.error("\u2705 CORS - No origin, using wildcard");
  } else {
    console.error("\u274C CORS - Origin not allowed:", origin);
    return res.status(403).json({ error: "CORS: Origin not allowed" });
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (origin && isAllowed) {
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    console.error("\u2705 CORS - Handling OPTIONS preflight request");
    res.sendStatus(200);
    return;
  }
  console.error("\u2705 CORS - Headers set, continuing to next middleware");
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  console.log("\u{1F527} Registering routes...");
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = Number(process.env.PORT) || 3e3;
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
  server.listen(port, host, () => {
    console.log(`\u2705 Server is running at http://${host}:${port}`);
    console.log(`\u{1F30D} Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`\u{1F680} Ready to accept connections`);
    console.log("\u{1F50D} Railway PORT env var:", process.env.PORT);
    console.log("\u{1F50D} All env vars:", Object.keys(process.env).filter((key) => key.includes("PORT")));
  });
})();
//# sourceMappingURL=server.js.map
