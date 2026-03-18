import crypto from "node:crypto";
import { hasDatabase, query } from "../db/client.js";

const memorySessions = new Map();

function makeMemorySession(row) {
  return { ...row };
}

function mapDbRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    team_id: row.team_id,
    event_id: row.event_id,
    evaluation_plan_id: row.evaluation_plan_id,
    created_by_user_id: row.created_by_user_id,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function duplicateSessionError() {
  const err = new Error("session_already_exists");
  err.code = "session_already_exists";
  return err;
}

export async function createEvaluationSession({
  orgId,
  teamId,
  eventId,
  evaluationPlanId,
  createdByUserId,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!teamId || !eventId || !evaluationPlanId || !createdByUserId) {
    throw new Error("missing_fields");
  }

  if (!hasDatabase()) {
    for (const session of memorySessions.values()) {
      if (
        session.event_id === eventId &&
        session.evaluation_plan_id === evaluationPlanId
      ) {
        throw duplicateSessionError();
      }
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: orgId,
      team_id: teamId,
      event_id: eventId,
      evaluation_plan_id: evaluationPlanId,
      created_by_user_id: createdByUserId,
      started_at: now,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    memorySessions.set(id, row);
    return makeMemorySession(row);
  }

  try {
    const result = await query(
      `INSERT INTO evaluation_sessions (
         org_id,
         team_id,
         event_id,
         evaluation_plan_id,
         created_by_user_id
       )
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, org_id, team_id, event_id, evaluation_plan_id,
                 created_by_user_id, started_at, completed_at, created_at, updated_at`,
      [orgId, teamId, eventId, evaluationPlanId, createdByUserId]
    );
    return mapDbRow(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      throw duplicateSessionError();
    }
    throw err;
  }
}

export async function getEvaluationSessionById({ orgId, sessionId }) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) return null;

  if (!hasDatabase()) {
    const row = memorySessions.get(sessionId) || null;
    if (!row) return null;
    if (row.org_id !== orgId) return null;
    return makeMemorySession(row);
  }

  const result = await query(
    `SELECT id, org_id, team_id, event_id, evaluation_plan_id,
            created_by_user_id, started_at, completed_at, created_at, updated_at
     FROM evaluation_sessions
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [orgId, sessionId]
  );
  return mapDbRow(result.rows[0]);
}

export async function listEvaluationSessions({ orgId }) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const rows = Array.from(memorySessions.values())
      .filter((row) => row.org_id === orgId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    return rows.map(makeMemorySession);
  }

  const result = await query(
    `SELECT id, org_id, team_id, event_id, evaluation_plan_id,
            created_by_user_id, started_at, completed_at, created_at, updated_at
     FROM evaluation_sessions
     WHERE org_id = $1
     ORDER BY started_at DESC, created_at DESC`,
    [orgId]
  );
  return result.rows.map(mapDbRow);
}

export async function findEvaluationSessionByEventPlan({ orgId, eventId, evaluationPlanId }) {
  if (!orgId) throw new Error("orgId required");
  if (!eventId || !evaluationPlanId) return null;

  if (!hasDatabase()) {
    const match = Array.from(memorySessions.values()).find(
      (row) =>
        row.org_id === orgId &&
        row.event_id === eventId &&
        row.evaluation_plan_id === evaluationPlanId
    );
    return match ? makeMemorySession(match) : null;
  }

  const result = await query(
    `SELECT id, org_id, team_id, event_id, evaluation_plan_id,
            created_by_user_id, started_at, completed_at, created_at, updated_at
     FROM evaluation_sessions
     WHERE org_id = $1 AND event_id = $2 AND evaluation_plan_id = $3
     LIMIT 1`,
    [orgId, eventId, evaluationPlanId]
  );
  return mapDbRow(result.rows[0]);
}

export async function completeEvaluationSession({ orgId, sessionId }) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) throw new Error("sessionId required");

  if (!hasDatabase()) {
    const existing = memorySessions.get(sessionId);
    if (!existing || existing.org_id !== orgId) {
      return null;
    }
    if (!existing.completed_at) {
      const now = new Date().toISOString();
      existing.completed_at = now;
      existing.updated_at = now;
      memorySessions.set(sessionId, existing);
    }
    return makeMemorySession(existing);
  }

  const result = await query(
    `UPDATE evaluation_sessions
     SET completed_at = COALESCE(completed_at, NOW()),
         updated_at = NOW()
     WHERE org_id = $1 AND id = $2
     RETURNING id, org_id, team_id, event_id, evaluation_plan_id,
               created_by_user_id, started_at, completed_at, created_at, updated_at`,
    [orgId, sessionId]
  );
  if (!result.rows.length) {
    return null;
  }
  return mapDbRow(result.rows[0]);
}
