import { Request, Response } from "express";
import { ChatbotService } from "./chatbotService";

export class ChatbotController {
    static async ask(req: any, res: Response) {
        try {
            const { question, personalityType } = req.body;

            if (!question || !question.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Question is required'
                });
            }

            console.log(`User ${req.user.username} (${personalityType || 'no personality'}) asked: ${question}`);

            // Call Python chatbot with personality context
            const response = await ChatbotService.askQuestion(question, personalityType);

            // Check if the response indicates an error
            if (!(response as any).success) {
                return res.status(500).json({
                    success: false,
                    error: 'Chatbot error',
                    details: (response as any).error
                });
            }

            res.json({
                success: true,
                question: (response as any).question,
                answer: (response as any).answer,
                user: req.user.username,
                personalityType: personalityType || null,
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            console.error('Chatbot API error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message
            });
        }
    }

    static async status(req: any, res: Response) {
        try {
            console.log('Checking chatbot status...');

            // Test if Python chatbot is working
            const testResponse = await ChatbotService.checkStatus();
            console.log('Status check response:', testResponse);

            const isWorking = (testResponse as any).success;

            res.json({
                status: isWorking ? 'online' : 'offline',
                pythonWorking: isWorking,
                message: isWorking ? 'Chatbot is ready' : ((testResponse as any).error || 'Chatbot unavailable')
            });
        } catch (error: any) {
            console.error('Status check error:', error);
            res.json({
                status: 'offline',
                pythonWorking: false,
                message: error.message
            });
        }
    }
}