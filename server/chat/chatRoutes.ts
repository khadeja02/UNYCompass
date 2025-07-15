import { Router } from "express";
import { ChatController } from "./chatController";

const router = Router();
const chatController = new ChatController();

// EXACT same paths as original
router.get("/personality-types", chatController.getPersonalityTypes);
router.post("/chat-sessions", chatController.createChatSession);
router.get("/chat-sessions", chatController.getChatSessions);
router.post("/messages", chatController.createMessage);
router.get("/messages/:sessionId", chatController.getMessagesBySessionId);

export default router;