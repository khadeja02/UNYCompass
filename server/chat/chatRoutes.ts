import { Router } from "express";
import { ChatController } from "./chatController";
import { authenticateToken } from "../auth/authMiddleware"; // 👈 ADDED

const router = Router();
const chatController = new ChatController();

// Public endpoint - no auth needed
router.get("/personality-types", chatController.getPersonalityTypes);

// 👈 UPDATED: All other endpoints require authentication
router.post("/chat-sessions", authenticateToken, chatController.createChatSession);
router.get("/chat-sessions", authenticateToken, chatController.getChatSessions);
router.post("/messages", authenticateToken, chatController.createMessage);
router.get("/messages/:sessionId", authenticateToken, chatController.getMessagesBySessionId);

export default router;