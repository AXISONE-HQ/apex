import crypto from "node:crypto";

const sessions = new Map();
const TTL_MS = 15 * 60 * 1000;

export function createSession({ userId, roles = [], permissions = [], activeOrgId = "org_demo" }) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + TTL_MS;
  sessions.set(sessionId, { userId, roles, permissions, activeOrgId, expiresAt });
  return { sessionId, expiresAt: new Date(expiresAt).toISOString() };
}

export function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return s;
}

export function destroySession(sessionId) {
  if (!sessionId) return;
  sessions.delete(sessionId);
}
