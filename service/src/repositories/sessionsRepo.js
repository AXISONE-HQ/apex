import crypto from "node:crypto";
import { hasDatabase, query } from "../db/client.js";

const sessions = new Map();
const TTL_MS = 15 * 60 * 1000;

export async function createSession({ userId, roles = [], permissions = [], activeOrgId = null }) {
  const sessionId = crypto.randomUUID();
  const expiresAtMs = Date.now() + TTL_MS;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  if (!hasDatabase()) {
    sessions.set(sessionId, { userId, roles, permissions, activeOrgId, expiresAt: expiresAtMs });
    return { sessionId, expiresAt: expiresAtIso };
  }

  await query(
    `INSERT INTO sessions (id, user_id, active_org_id, roles, permissions, expires_at)
     VALUES ($1, $2, $3, $4::text[], $5::text[], $6::timestamptz)`,
    [sessionId, userId, activeOrgId, roles, permissions, expiresAtIso]
  );

  return { sessionId, expiresAt: expiresAtIso };
}

export async function getSession(sessionId) {
  if (!sessionId) return null;

  if (!hasDatabase()) {
    const s = sessions.get(sessionId);
    if (!s) return null;
    if (Date.now() > s.expiresAt) {
      sessions.delete(sessionId);
      return null;
    }
    return s;
  }

  const result = await query(
    `SELECT id, user_id, active_org_id, roles, permissions, expires_at
     FROM sessions
     WHERE id = $1`,
    [sessionId]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await destroySession(sessionId);
    return null;
  }

  return {
    userId: row.user_id,
    activeOrgId: row.active_org_id,
    roles: row.roles || [],
    permissions: row.permissions || [],
    expiresAt: new Date(row.expires_at).getTime()
  };
}

export async function destroySession(sessionId) {
  if (!sessionId) return;

  if (!hasDatabase()) {
    sessions.delete(sessionId);
    return;
  }

  await query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
}
