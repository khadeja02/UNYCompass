import express, { type Request, Response, NextFunction } from "express";
import { config } from 'dotenv';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

console.log('🚨🚨🚨 RAILWAY UPDATE TEST v4.0 🚨🚨🚨');
// Load environment variables
config();

// Environment check
console.log('🔧 Environment check:');
console.log('  JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('  DATABASE_URL exists:', !!process.env.DATABASE_PUBLIC_URL);

const app = express();

// 1. FIRST: JSON parsing middleware (MUST come first)
console.log('🔧 Setting up express.json() middleware');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// DEBUG: Check if body parsing is working
app.use((req, res, next) => {
  if (req.path.includes('/api/auth') && req.method === 'POST') {
    console.error('🔧 MIDDLEWARE DEBUG - Path:', req.path);
    console.error('🔧 MIDDLEWARE DEBUG - Method:', req.method);
    console.error('🔧 MIDDLEWARE DEBUG - Body parsed:', !!req.body);
    console.error('🔧 MIDDLEWARE DEBUG - Body content:', req.body);
    console.error('🔧 MIDDLEWARE DEBUG - Content-Type:', req.headers['content-type']);
    console.error('🔧 MIDDLEWARE DEBUG - Raw headers:', req.headers);
  }
  next();
});

// 2. SECOND: CORS middleware (after JSON parsing)
console.log('🔧 Setting up CORS middleware');
app.use((req, res, next) => {
  console.error('🌐 CORS - Processing request:', req.method, req.path);

  // Set CORS headers for ALL requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.error('✅ CORS - Handling OPTIONS preflight request');
    res.sendStatus(200);
    return;
  }

  console.error('✅ CORS - Headers set, continuing to next middleware');
  next();
});

// 3. THIRD: Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// 4. LAST: Register routes
(async () => {
  console.log('🔧 Registering routes...');
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup environment-specific serving
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Railway-compatible port configuration
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

  server.listen(port, host, () => {
    console.log(`✅ Server is running at http://${host}:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀 Ready to accept connections`);
    console.log('🔍 Railway PORT env var:', process.env.PORT);
    console.log('🔍 All env vars:', Object.keys(process.env).filter(key => key.includes('PORT')));
  });
})();