import { Router } from "express";
import { ChatbotController } from "./chatbotController";
import { authenticateToken } from "../auth/authMiddleware";

const router = Router();

// Ask chatbot endpoint (authenticated users only) - Updated to include personality type
router.post('/ask', authenticateToken, ChatbotController.ask);

// Check chatbot status endpoint
router.get('/status', authenticateToken, ChatbotController.status);

export default router;