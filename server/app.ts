import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.ts";
import { architectRouter } from "./routes/architect.ts";
import { db } from "./db.ts";

export function createExpressApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());

  // API router
  const apiRouter = express.Router();

  apiRouter.get("/", (_req, res) => {
    res.json({
      name: "LevelUp — AI Web Architect Engine",
      version: "2.5.0",
      status: "operational",
      database: db.getStats(),
      timestamp: new Date().toISOString(),
    });
  });

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

  // Mount Auth routes under /api/auth
  apiRouter.use("/auth", authRouter);

  // Mount Architect & DB routes
  apiRouter.use(architectRouter);

  app.use("/api", apiRouter);

  // Centralized Error-handling Middleware to guarantee clean JSON and prevent raw 500 HTML crashes
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Studio API Error Caught]:", err?.stack || err);
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({
      error: true,
      status,
      detail: err?.message || "Une erreur inattendue est survenue dans l'architecte.",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
