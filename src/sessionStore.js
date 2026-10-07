import crypto from "node:crypto";

const sessions = new Map();
const MAX_MESSAGES = 24;
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

function now() {
  return Date.now();
}

function makeId() {
  return crypto.randomUUID();
}

function getOrCreate(sessionId) {
  const id = sessionId && sessions.has(sessionId) ? sessionId : makeId();

  if (!sessions.has(id)) {
    sessions.set(id, {
      id,
      createdAt: now(),
      updatedAt: now(),
      messages: [],
    });
  }

  return sessions.get(id);
}

export function getSession(sessionId) {
  pruneSessions();
  return getOrCreate(sessionId);
}

export function getHistory(sessionId) {
  return getSession(sessionId).messages.slice(-MAX_MESSAGES);
}

export function appendTurn(sessionId, userMessage, assistantMessage) {
  const session = getSession(sessionId);

  session.messages.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantMessage }
  );

  session.messages = session.messages.slice(-MAX_MESSAGES);
  session.updatedAt = now();

  return session;
}

export function clearSession(sessionId) {
  if (sessionId) sessions.delete(sessionId);
}

export function pruneSessions() {
  const cutoff = now() - SESSION_TTL_MS;

  for (const [id, session] of sessions.entries()) {
    if (session.updatedAt < cutoff) sessions.delete(id);
  }
}
