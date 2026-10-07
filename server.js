import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  askRavin,
  normalizeMode,
  RAVIN_MODELS,
} from "./src/cloudflareClient.js";
import {
  appendTurn,
  clearSession,
  getHistory,
  getSession,
} from "./src/sessionStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8765);

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "RAVIN Core",
    version: "0.2.0",
    aiConfigured: Boolean(
      process.env.CLOUDFLARE_ACCOUNT_ID &&
        (process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_KEY)
    ),
    models: RAVIN_MODELS,
  });
});

app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;
  const requestedSessionId = req.body?.session_id || null;
  const mode = normalizeMode(req.body?.mode);

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  if (message.length > 12000) {
    return res.status(413).json({ error: "Message is too large." });
  }

  const session = getSession(requestedSessionId);
  const history = getHistory(session.id);
  const startedAt = Date.now();

  try {
    const result = await askRavin({
      message,
      history,
      mode,
    });

    appendTurn(session.id, message.trim(), result.reply);

    res.json({
      reply: result.reply,
      session_id: session.id,
      mode: result.mode,
      model: result.model,
      usage: result.usage,
      latency_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[RAVIN Core]", error);

    const status =
      error?.code === "RAVIN_NOT_CONFIGURED"
        ? 503
        : Number(error?.status) || 500;

    res.status(status).json({
      error: error instanceof Error ? error.message : String(error),
      code: error?.code || "RAVIN_ERROR",
      session_id: session.id,
    });
  }
});

app.post("/api/session/reset", (req, res) => {
  clearSession(req.body?.session_id || null);
  res.json({ ok: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("RAVIN Core v0.2 online");
  console.log("Local: http://127.0.0.1:" + PORT);
  console.log("Codespaces: open the forwarded port " + PORT);
  console.log("");
});
