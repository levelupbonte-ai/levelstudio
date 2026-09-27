import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.ts";
import { architectRouter } from "./routes/architect.ts";

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());

  // API router
  const apiRouter = express.Router();

  apiRouter.get("/", (_req, res) => {
    res.json({ message: "LevelUp Studio API ready" });
  });

  apiRouter.get("/status", (_req, res) => {
    res.json([{ id: "status-1", client_name: "levelstudio", timestamp: new Date().toISOString() }]);
  });

  apiRouter.post("/status", (req, res) => {
    res.json({
      id: `status-${Date.now()}`,
      client_name: req.body?.client_name || "client",
      timestamp: new Date().toISOString(),
    });
  });

  apiRouter.use("/auth", authRouter);
  apiRouter.use(architectRouter);

  app.use("/api", apiRouter);

  return app;
}
