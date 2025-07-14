import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import auth modules - ONLY for organization, no new functionality
import { AuthService } from "./auth/authService";
import { authenticateToken } from "./auth/authMiddleware";
import authRoutes from "./auth/authRoutes";

// Import existing modules
import { storage } from "./storage";
import { insertChatSessionSchema, insertMessageSchema } from "@shared/schema";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to call Python chatbot - EXACT same as original
const callPythonChatbot = (question: string, personalityType?: string) => {
  return new Promise((resolve, reject) => {
    // Path to the Python API wrapper
    const pythonScriptPath = path.join(__dirname, '..', 'ai-backend', 'api', 'chatbot_api.py');

    // Set working directory to the ai-backend directory so Python can find relative paths
    const workingDirectory = path.join(__dirname, '..', 'ai-backend');

    console.log(`Calling Python script: ${pythonScriptPath}`);
    console.log(`Working directory: ${workingDirectory}`);

    // Prepare the question with personality context if provided
    let contextualQuestion = question;
    if (personalityType && personalityType !== 'chatbot' && personalityType !== 'unknown') {
      contextualQuestion = `I am a ${personalityType.toUpperCase()} personality type. ${question}`;
    }

    console.log(`Question to send: ${contextualQuestion}`);

    // Spawn Python process with correct working directory
    const pythonProcess = spawn('python3', [pythonScriptPath, contextualQuestion], {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      // Log debug output for troubleshooting
      const errorLine = data.toString().trim();
      if (errorLine.startsWith('DEBUG:')) {
        console.log('Python Debug:', errorLine);
      } else {
        console.error('Python STDERR:', errorLine);
      }
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      console.log(`Raw Python output: ${dataString}`);

      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        if (errorString) {
          console.error('Python errors:', errorString);
        }
        reject(new Error(`Python process exited with code ${code}: ${errorString}`));
        return;
      }

      try {
        // Clean the output - remove any extra whitespace or debug output
        const cleanOutput = dataString.trim();
        if (!cleanOutput) {
          reject(new Error('No output from Python script'));
          return;
        }

        const result = JSON.parse(cleanOutput);
        console.log('Parsed Python response:', result);
        resolve(result);
      } catch (parseError: any) {
        console.error('Failed to parse Python response:', dataString);
        console.error('Parse error:', parseError.message);
        reject(new Error(`Failed to parse Python response: ${parseError.message}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    // Set a timeout to prevent hanging
    setTimeout(() => {
      console.log('Python process timeout - killing process');
      pythonProcess.kill();
      reject(new Error('Python process timeout after 30 seconds'));
    }, 30000);
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize auth database - EXACT same as original
  await AuthService.createUsersTable();

  // =================================
  // CHATBOT API ENDPOINTS - EXACT same as original
  // =================================

  // Ask chatbot endpoint (authenticated users only) - Updated to include personality type
  app.post('/api/chatbot/ask', authenticateToken, async (req: any, res) => {
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
      const response = await callPythonChatbot(question, personalityType);

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
  });

  // Check chatbot status endpoint - EXACT same as original
  app.get('/api/chatbot/status', authenticateToken, async (req: any, res) => {
    try {
      console.log('Checking chatbot status...');

      // Test if Python chatbot is working
      const testResponse = await callPythonChatbot('test');
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
  });

  // =================================
  // AUTH ENDPOINTS - Now modular but EXACT same functionality
  // =================================
  app.use('/api/auth', authRoutes);

  // =================================
  // EXISTING CHAT ROUTES - EXACT same as original
  // =================================

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

      // Generate AI response using Hunter chatbot instead of hardcoded message
      if (validatedData.isUser) {
        let aiResponseContent;

        try {
          // Try to get response from Hunter AI chatbot
          const chatbotResponse = await callPythonChatbot(validatedData.content);

          if ((chatbotResponse as any).success) {
            aiResponseContent = (chatbotResponse as any).answer;
          } else {
            // Fallback if chatbot fails
            aiResponseContent = "I'm having trouble accessing the Hunter College information right now. Please try asking about specific programs or requirements.";
          }
        } catch (error) {
          console.error('Chatbot error in messages endpoint:', error);
          // Fallback response
          aiResponseContent = "I'm here to help you find information about Hunter College programs. What would you like to know about?";
        }

        const aiResponse = await storage.createMessage({
          chatSessionId: validatedData.chatSessionId,
          content: aiResponseContent,
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

  // Health check - EXACT same as original
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: ['auth', 'chat', 'chatbot']
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}