import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createExpressApp } from "./server/app.ts";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  return undefined;
}

const cliPort = getArg("--port") || getArg("-p");
// Nginx binds to 8080, so the Node app must always bind to port 3000
const envPort = process.env.PORT && process.env.PORT !== "8080" ? process.env.PORT : undefined;
const PORT = parseInt(cliPort || envPort || "3000", 10);
const HOST = getArg("--host") || getArg("-H") || process.env.HOST || "0.0.0.0";

async function startServer() {
  const app = createExpressApp();

  // Frontend integration
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
