import { hasDatabase, query } from "../db/client.js";

const memoryEvaluations = new Map();
let evalSeq = 1;

function makeMemoryId() {
  return `evaluation_${evalSeq++}`;
}

export async function createPlayerEvaluation({
  orgId,
  playerId,
  eventId = null,
  authorUserId = null,
  title,
  summary = null,
  strengths = null,
  improvements = null,
  rating = null,
  status = "published",
}) {
  if (!orgId || !playerId || !title) throw new Error("orgId, playerId, title required");

  if (!hasDatabase()) {
    const now = new Date().toISOString();
    const row = {
      id: makeMemoryId(),
      org_id: String(orgId),
      player_id: String(playerId),
      event_id: eventId ? String(eventId) : null,
      author_user_id: authorUserId,
      title,
      summary,
      strengths,
      improvements,
      rating,
      status,
      created_at: now,
      updated_at: now,
    };
    memoryEvaluations.set(row.id, row);
    return row;
  }

  const result = await query(
    `INSERT INTO player_evaluations (
       org_id,
       player_id,
       event_id,
       author_user_id,
       title,
       summary,
       strengths,
       improvements,
       rating,
       status
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, org_id, player_id, event_id, author_user_id, title, summary,
               strengths, improvements, rating, status, created_at, updated_at`,
    [orgId, playerId, eventId ?? null, authorUserId, title, summary, strengths, improvements, rating, status]
  );

  return result.rows[0];
}

export async function listEvaluationsByPlayer({ orgId, playerId }) {
  if (!orgId || !playerId) throw new Error("orgId and playerId required");

  if (!hasDatabase()) {
    const rows = Array.from(memoryEvaluations.values()).filter(
      (row) => row.org_id === String(orgId) && row.player_id === String(playerId)
    );
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const result = await query(
    `SELECT id, org_id, player_id, event_id, author_user_id, title, summary,
            strengths, improvements, rating, status, created_at, updated_at
     FROM player_evaluations
     WHERE org_id = $1 AND player_id = $2
     ORDER BY created_at DESC`,
    [orgId, playerId]
  );

  return result.rows;
}

export async function getEvaluationByIdAndPlayer({ evaluationId, playerId, orgId }) {
  if (!evaluationId || !playerId || !orgId) throw new Error("evaluationId, playerId, orgId required");

  if (!hasDatabase()) {
    for (const row of memoryEvaluations.values()) {
      if (row.id === evaluationId && row.player_id === String(playerId) && row.org_id === String(orgId)) {
        return row;
      }
    }
    return null;
  }

  const result = await query(
    `SELECT id, org_id, player_id, event_id, author_user_id, title, summary,
            strengths, improvements, rating, status, created_at, updated_at
     FROM player_evaluations
     WHERE id = $1 AND player_id = $2 AND org_id = $3
     LIMIT 1`,
    [evaluationId, playerId, orgId]
  );

  return result.rows[0] || null;
}

export async function updatePlayerEvaluation({ evaluationId, playerId, orgId, patch = {} }) {
  if (!evaluationId || !playerId || !orgId) throw new Error("evaluationId, playerId, orgId required");

  const entries = Object.entries(patch || {});
  if (!entries.length) throw new Error("no_updatable_fields");

  if (!hasDatabase()) {
    const existing = await getEvaluationByIdAndPlayer({ evaluationId, playerId, orgId });
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated = { ...existing, ...patch, updated_at: now };
    memoryEvaluations.set(evaluationId, updated);
    return updated;
  }

  const set = [];
  const values = [];
  let i = 1;
  for (const [key, value] of entries) {
    set.push(`${key} = $${i++}`);
    values.push(value);
  }
  set.push(`updated_at = NOW()`);

  values.push(evaluationId);
  values.push(playerId);
  values.push(orgId);

  const result = await query(
    `UPDATE player_evaluations
     SET ${set.join(", ")}
     WHERE id = $${values.length - 2} AND player_id = $${values.length - 1} AND org_id = $${values.length}
     RETURNING id, org_id, player_id, event_id, author_user_id, title, summary,
               strengths, improvements, rating, status, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}
