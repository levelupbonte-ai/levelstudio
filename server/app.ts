import path from "node:path";
import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.ts";
import { architectRouter } from "./routes/architect.ts";
import { db } from "./db.ts";

export function createExpressApp() {
  const app = express();
  app.set("trust proxy", 1);

  // Direct SEO endpoints for crawlers
  const publicDir = path.resolve(process.cwd(), "public");
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").sendFile(path.join(publicDir, "robots.txt"));
  });
  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").sendFile(path.join(publicDir, "sitemap.xml"));
  });
  app.get("/llms.txt", (_req, res) => {
    res.type("text/plain; charset=utf-8").sendFile(path.join(publicDir, "llms.txt"));
  });

  // CORS middleware for custom domains & deployments
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-Client-FP");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());

  // API router
  const apiRouter = express.Router();

  apiRouter.get("/status", (_req, res) => {
    res.json([{
      id: "status-core",
      client_name: "levelstudio",
      database: "connected",
      storage: "persistent_json_engine",
      timestamp: new Date().toISOString(),
    }]);
  });

  apiRouter.post("/status", (req, res) => {
    res.json({
      id: `status-${Date.now()}`,
      client_name: req.body?.client_name || "client",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Auth routes under /auth
  apiRouter.use("/auth", authRouter);

  // Mount Architect & DB routes
  apiRouter.use(architectRouter);

  // Mount API router under /api
  app.use("/api", apiRouter);

  // Centralized Error-handling Middleware to guarantee clean JSON and prevent raw 500 HTML crashes
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Studio API Error Caught]:", err?.stack || err);
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({
      error: true,
      status,
      detail: err?.message || "An unexpected error occurred in the website builder.",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
