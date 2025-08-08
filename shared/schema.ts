import { table } from "console";
import { IsPrimaryKey, NotNull } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, varchar, PgSerialBuilderInitial, PgTextBuilder } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// UPDATED: Match your EXACT existing users table structure + password reset fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  // NEW: Password reset fields
  reset_token: varchar("reset_token", { length: 255 }),
  reset_token_expiry: timestamp("reset_token_expiry"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Chat tables (unchanged)
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatSessionId: integer("chat_session_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password_hash: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  userId: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatSessionId: true,
  content: true,
  isUser: true,
});

// NEW: Password reset request schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
});

// Extended interfaces for chatbot functionality
export interface ChatbotRequest {
  question: string;
  personalityType?: string;
}

export interface ChatbotResponse {
  success: boolean;
  question: string;
  answer: string;
  user: string;
  personalityType?: string;
  timestamp: string;
  error?: string;
  details?: string;
}

// NEW: Password reset interfaces
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  message: string;
  error?: string;
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;