import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from 'url';

// Handle __dirname in ES modules for bundled environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Only setup Vite in development
  if (process.env.NODE_ENV !== "development") {
    log("⚠️  Vite setup skipped - production environment");
    return;
  }

  try {
    // Check if vite config exists (for root deployment)
    const viteConfigPath = path.resolve(__dirname, "..", "vite.config.ts");
    const hasViteConfig = fs.existsSync(viteConfigPath);

    if (!hasViteConfig) {
      log("⚠️  Vite config not found - skipping Vite dev setup");
      return;
    }

    // Dynamically import vite config
    const viteConfigModule = await import("../vite.config.ts");
    const viteConfig = viteConfigModule.default;

    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html",
        );

        // Check if client template exists
        if (!fs.existsSync(clientTemplate)) {
          log(`⚠️  Client template not found: ${clientTemplate}`);
          return next();
        }

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    log("✅ Vite dev server setup complete");
  } catch (error) {
    log(`⚠️  Could not setup Vite dev server: ${error}`);
  }
}

export function serveStatic(app: Express) {
  // For backend-only Railway deployment, don't serve static files
  // Frontend is deployed separately on Vercel
  log("📁 Backend-only deployment - static files handled by Vercel");

  // Add health check endpoints
  app.get("/", (req, res) => {
    res.json({
      message: "UNYCompass Auth API Server",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      timestamp: new Date().toISOString(),
      status: "running"
    });
  });

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "auth-backend",
      timestamp: new Date().toISOString(),
      database: !!process.env.DATABASE_PUBLIC_URL ? "configured" : "missing",
      jwt: !!process.env.JWT_SECRET ? "configured" : "missing"
    });
  });

  // Catch-all for unknown routes
  app.use("*", (req, res) => {
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