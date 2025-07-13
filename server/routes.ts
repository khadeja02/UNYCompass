import type { Express } from "express";
import { createServer, type Server } from "http";
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { storage } from "./storage";
import { insertChatSessionSchema, insertMessageSchema } from "@shared/schema";

// Load environment variables FIRST
config();

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PostgreSQL connection for auth - match the working server.js exactly
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Test database connection
const testConnection = async () => {
  try {
    console.log('Testing database connection...');
    console.log('Connection string:', process.env.DATABASE_PUBLIC_URL?.replace(/:[^:]*@/, ':****@')); // Hide password

    const client = await pool.connect();
    console.log('✅ Database connected successfully!');

    const result = await client.query('SELECT NOW()');
    console.log('✅ Query test successful:', result.rows[0]);

    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
};

// Initialize users table
const createUsersTable = async () => {
  // Test connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Skipping table creation due to connection failure');
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
    console.log('✅ Users table created or already exists');
  } catch (err) {
    console.error('❌ Error creating users table:', err);
  }
};

// Helper function to call Python chatbot
const callPythonChatbot = (question: string) => {
  return new Promise((resolve, reject) => {
    // Path to the Python API wrapper
    const pythonScriptPath = path.join(__dirname, '..', 'ai-backend', 'api', 'chatbot_api.py');

    // Spawn Python process
    const pythonProcess = spawn('python3', [pythonScriptPath, question], {
      cwd: __dirname
    });

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${errorString}`));
        return;
      }

      try {
        const result = JSON.parse(dataString);
        resolve(result);
      } catch (parseError: any) {
        reject(new Error(`Failed to parse Python response: ${parseError.message}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize auth database
  await createUsersTable();

  // =================================
  // CHATBOT API ENDPOINTS
  // =================================

  // Ask chatbot endpoint (authenticated users only)
  app.post('/api/chatbot/ask', authenticateToken, async (req: any, res) => {
    try {
      const { question } = req.body;

      if (!question || !question.trim()) {
        return res.status(400).json({ error: 'Question is required' });
      }

      console.log(`User ${req.user.username} asked: ${question}`);

      // Call Python chatbot
      const response = await callPythonChatbot(question);

      if ((response as any).error) {
        return res.status(500).json({
          error: 'Chatbot error',
          details: (response as any).error
        });
      }

      res.json({
        success: true,
        question: (response as any).question,
        answer: (response as any).answer,
        user: req.user.username,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Chatbot API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  });

  // Check chatbot status endpoint
  app.get('/api/chatbot/status', authenticateToken, async (req: any, res) => {
    try {
      // Test if Python chatbot is working
      const testResponse = await callPythonChatbot('test');

      res.json({
        status: 'online',
        pythonWorking: !(testResponse as any).error,
        message: (testResponse as any).error || 'Chatbot is ready'
      });
    } catch (error: any) {
      res.json({
        status: 'offline',
        pythonWorking: false,
        message: error.message
      });
    }
  });

  // =================================
  // AUTH ENDPOINTS
  // =================================

  // Register new user
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const result = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
        [username, email, passwordHash]
      );

      const newUser = result.rows[0];

      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        JWT_SECRET!,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.created_at
        },
        token
      });

    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login user
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const result = await pool.query(
        'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET!,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token
      });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user profile
  app.get('/api/auth/profile', authenticateToken, async (req: any, res) => {
    try {
      const result = await pool.query(
        'SELECT id, username, email, created_at FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: result.rows[0] });

    } catch (err) {
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user profile
  app.put('/api/auth/profile', authenticateToken, async (req: any, res) => {
    try {
      const { email } = req.body;
      const userId = req.user.userId;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const result = await pool.query(
        'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, updated_at',
        [email, userId]
      );

      res.json({
        message: 'Profile updated successfully',
        user: result.rows[0]
      });

    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update password
  app.put('/api/auth/password', authenticateToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      res.json({ message: 'Password updated successfully' });

    } catch (err) {
      console.error('Password update error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout
  app.post('/api/auth/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logout successful' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: ['auth', 'chat', 'chatbot']
    });
  });

  // =================================
  // EXISTING CHAT ROUTES
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