import { Router } from "express";
import { ChatbotController } from "./chatbotController";
import { authenticateToken } from "../auth/authMiddleware";

const router = Router();

// Ask chatbot endpoint (authenticated users only)
router.post('/ask', authenticateToken, ChatbotController.ask);

// Check chatbot status endpoint
router.get('/status', authenticateToken, ChatbotController.status);

// ✅ NEW: Clear session memory endpoint
router.post('/reset/:sessionId', authenticateToken, ChatbotController.clearSession);

export default router;