import { RAVIN_CORE_SYSTEM_PROMPT } from "./systemPrompt.js";

const DEFAULT_CONVERSATION_MODEL =
  process.env.CLOUDFLARE_CONVERSATION_MODEL ||
  "@cf/ibm-granite/granite-4.0-h-micro";

const DEFAULT_WORK_MODEL =
  process.env.CLOUDFLARE_WORK_MODEL ||
  "@cf/google/gemma-4-26b-a4b-it";

export const RAVIN_MODELS = Object.freeze({
  conversation: DEFAULT_CONVERSATION_MODEL,
  work: DEFAULT_WORK_MODEL,
});

export function normalizeMode(mode) {
  return String(mode || "").toLowerCase() === "work" ? "work" : "conversation";
}

function getConfig() {
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const apiToken = String(
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CLOUDFLARE_API_KEY ||
    ""
  ).trim();

  if (!accountId) {
    const error = new Error("Missing CLOUDFLARE_ACCOUNT_ID.");
    error.code = "RAVIN_NOT_CONFIGURED";
    throw error;
  }

  if (!apiToken) {
    const error = new Error("Missing CLOUDFLARE_API_TOKEN.");
    error.code = "RAVIN_NOT_CONFIGURED";
    throw error;
  }

  return {
    accountId,
    apiToken,
    baseUrl:
      "https://api.cloudflare.com/client/v4/accounts/" +
      encodeURIComponent(accountId) +
      "/ai/v1",
  };
}

function trimConversation(messages, maxMessages = 16) {
  const clean = (messages || []).filter(
    (message) =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string" &&
      message.content.trim()
  );

  return clean.slice(-maxMessages);
}

async function parseFailure(response) {
  let detail = "";

  try {
    const data = await response.json();
    detail =
      data?.errors?.[0]?.message ||
      data?.error?.message ||
      data?.error ||
      JSON.stringify(data);
  } catch {
    detail = await response.text().catch(() => "");
  }

  const error = new Error(
    "Cloudflare Workers AI request failed (" +
      response.status +
      ")." +
      (detail ? " " + detail : "")
  );
  error.status = response.status;
  error.code = "CLOUDFLARE_API_ERROR";
  throw error;
}

export async function askRavin({
  message,
  history = [],
  mode = "conversation",
}) {
  const config = getConfig();
  const normalizedMode = normalizeMode(mode);
  const model = RAVIN_MODELS[normalizedMode];

  const messages = [
    { role: "system", content: RAVIN_CORE_SYSTEM_PROMPT },
    ...trimConversation(history),
    { role: "user", content: message.trim() },
  ];

  let response;
  try {
    response = await fetch(config.baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: normalizedMode === "work" ? 0.35 : 0.75,
        max_tokens: normalizedMode === "work" ? 1500 : 700,
        stream: false,
      }),
    });
  } catch (error) {
    const wrapped = new Error(
      "Could not reach Cloudflare Workers AI. " +
        (error?.message || String(error))
    );
    wrapped.code = "RAVIN_NETWORK_ERROR";
    throw wrapped;
  }

  if (!response.ok) {
    await parseFailure(response);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("RAVIN received an empty response from the model.");
  }

  return {
    reply,
    mode: normalizedMode,
    model: data?.model || model,
    usage: data?.usage || null,
  };
}
