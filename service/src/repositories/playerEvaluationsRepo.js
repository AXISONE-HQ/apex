import crypto from "node:crypto";
import { hasDatabase, query } from "../db/client.js";

const memoryManualEvaluations = new Map();
const memorySessionEvaluations = new Map();
const memoryLogs = [];

function makeManualRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    player_id: row.player_id,
    event_id: row.event_id,
    author_user_id: row.author_user_id,
    title: row.title,
    summary: row.summary,
    strengths: row.strengths,
    improvements: row.improvements,
    rating: row.rating,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function makeSessionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    session_id: row.session_id,
    player_id: row.player_id,
    block_id: row.block_id,
    score: row.score,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Manual player evaluations -------------------------------------------------

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
  if (!orgId || !playerId || !title) {
    throw new Error("orgId, playerId, and title are required");
  }

  if (!hasDatabase()) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: orgId,
      player_id: playerId,
      event_id: eventId,
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
    memoryManualEvaluations.set(id, row);
    return makeManualRow(row);
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
     RETURNING id, org_id, player_id, event_id, author_user_id,
               title, summary, strengths, improvements, rating, status,
               created_at, updated_at`,
    [orgId, playerId, eventId, authorUserId, title, summary, strengths, improvements, rating, status]
  );
  return makeManualRow(result.rows[0]);
}

export async function listEvaluationsByPlayer({ orgId, playerId }) {
  if (!orgId || !playerId) throw new Error("orgId and playerId required");

  if (!hasDatabase()) {
    return Array.from(memoryManualEvaluations.values())
      .filter((row) => row.org_id === orgId && row.player_id === playerId)
      .map(makeManualRow)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const result = await query(
    `SELECT id, org_id, player_id, event_id, author_user_id,
            title, summary, strengths, improvements, rating, status,
            created_at, updated_at
     FROM player_evaluations
     WHERE org_id = $1 AND player_id = $2 AND session_id IS NULL
     ORDER BY created_at DESC`,
    [orgId, playerId]
  );
  return result.rows.map(makeManualRow);
}

export async function getEvaluationByIdAndPlayer({ orgId, playerId, evaluationId }) {
  if (!orgId || !playerId || !evaluationId) throw new Error("missing identifiers");

  if (!hasDatabase()) {
    const row = memoryManualEvaluations.get(evaluationId) || null;
    if (!row) return null;
    if (row.org_id !== orgId || row.player_id !== playerId) return null;
    return makeManualRow(row);
  }

  const result = await query(
    `SELECT id, org_id, player_id, event_id, author_user_id,
            title, summary, strengths, improvements, rating, status,
            created_at, updated_at
     FROM player_evaluations
     WHERE org_id = $1 AND player_id = $2 AND id = $3 AND session_id IS NULL
     LIMIT 1`,
    [orgId, playerId, evaluationId]
  );
  return makeManualRow(result.rows[0]);
}

export async function updatePlayerEvaluation({
  orgId,
  playerId,
  evaluationId,
  summary,
  strengths,
  improvements,
  rating,
  status,
}) {
  if (!orgId || !playerId || !evaluationId) throw new Error("missing identifiers");

  if (!hasDatabase()) {
    const existing = memoryManualEvaluations.get(evaluationId);
    if (!existing) return null;
    if (existing.org_id !== orgId || existing.player_id !== playerId) return null;
    const updated = {
      ...existing,
      summary: summary ?? existing.summary,
      strengths: strengths ?? existing.strengths,
      improvements: improvements ?? existing.improvements,
      rating: rating ?? existing.rating,
      status: status ?? existing.status,
      updated_at: new Date().toISOString(),
    };
    memoryManualEvaluations.set(evaluationId, updated);
    return makeManualRow(updated);
  }

  const fields = [];
  const values = [orgId, playerId, evaluationId];

  if (summary !== undefined) {
    values.push(summary);
    fields.push(`summary = $${values.length}`);
  }
  if (strengths !== undefined) {
    values.push(strengths);
    fields.push(`strengths = $${values.length}`);
  }
  if (improvements !== undefined) {
    values.push(improvements);
    fields.push(`improvements = $${values.length}`);
  }
  if (rating !== undefined) {
    values.push(rating);
    fields.push(`rating = $${values.length}`);
  }
  if (status !== undefined) {
    values.push(status);
    fields.push(`status = $${values.length}`);
  }

  if (!fields.length) {
    return await getEvaluationByIdAndPlayer({ orgId, playerId, evaluationId });
  }

  values.push(`$${values.length + 1}`);

  const result = await query(
    `UPDATE player_evaluations
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE org_id = $1 AND player_id = $2 AND id = $3 AND session_id IS NULL
     RETURNING id, org_id, player_id, event_id, author_user_id,
               title, summary, strengths, improvements, rating, status,
               created_at, updated_at`,
    [orgId, playerId, evaluationId, ...values.slice(3, -1)]
  );
  if (!result.rows.length) return null;
  return makeManualRow(result.rows[0]);
}

// Session-based evaluations --------------------------------------------------

function duplicateSessionEvaluationError() {
  const err = new Error("player_evaluation_exists");
  err.code = "player_evaluation_exists";
  return err;
}

export async function createSessionPlayerEvaluation({
  orgId,
  sessionId,
  playerId,
  blockId,
  score,
  notes = null,
}) {
  if (!orgId || !sessionId || !playerId || !blockId) {
    throw new Error("missing_fields");
  }

  if (!hasDatabase()) {
    for (const evalRow of memorySessionEvaluations.values()) {
      if (
        evalRow.session_id === sessionId &&
        evalRow.player_id === playerId &&
        evalRow.block_id === blockId
      ) {
        throw duplicateSessionEvaluationError();
      }
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: orgId,
      session_id: sessionId,
      player_id: playerId,
      block_id: blockId,
      score,
      notes,
      created_at: now,
      updated_at: now,
    };
    memorySessionEvaluations.set(id, row);
    return makeSessionRow(row);
  }

  try {
    const result = await query(
      `INSERT INTO player_evaluations (
         org_id,
         session_id,
         player_id,
         block_id,
         score,
         notes
       )
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, org_id, session_id, player_id, block_id, score, notes, created_at, updated_at`,
      [orgId, sessionId, playerId, blockId, score, notes]
    );
    return makeSessionRow(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      throw duplicateSessionEvaluationError();
    }
    throw err;
  }
}

export async function getSessionPlayerEvaluationById({ orgId, sessionId, playerEvaluationId }) {
  if (!orgId || !sessionId || !playerEvaluationId) return null;

  if (!hasDatabase()) {
    const row = memorySessionEvaluations.get(playerEvaluationId) || null;
    if (!row) return null;
    if (row.org_id !== orgId || row.session_id !== sessionId) return null;
    return makeSessionRow(row);
  }

  const result = await query(
    `SELECT id, org_id, session_id, player_id, block_id, score, notes, created_at, updated_at
     FROM player_evaluations
     WHERE org_id = $1 AND session_id = $2 AND id = $3
     LIMIT 1`,
    [orgId, sessionId, playerEvaluationId]
  );
  return makeSessionRow(result.rows[0]);
}

export async function getSessionPlayerEvaluation({ orgId, sessionId, playerId, blockId }) {
  if (!orgId || !sessionId || !playerId || !blockId) return null;

  if (!hasDatabase()) {
    const match = Array.from(memorySessionEvaluations.values()).find(
      (row) =>
        row.org_id === orgId &&
        row.session_id === sessionId &&
        row.player_id === playerId &&
        row.block_id === blockId
    );
    return match ? makeSessionRow(match) : null;
  }

  const result = await query(
    `SELECT id, org_id, session_id, player_id, block_id, score, notes, created_at, updated_at
     FROM player_evaluations
     WHERE org_id = $1 AND session_id = $2 AND player_id = $3 AND block_id = $4
     LIMIT 1`,
    [orgId, sessionId, playerId, blockId]
  );
  return makeSessionRow(result.rows[0]);
}

async function fetchSessionEvaluations({ orgId, sessionId, playerId = null }) {
  if (!orgId || !sessionId) throw new Error("orgId and sessionId required");

  if (!hasDatabase()) {
    let rows = Array.from(memorySessionEvaluations.values()).filter(
      (row) => row.org_id === orgId && row.session_id === sessionId
    );
    if (playerId) {
      rows = rows.filter((row) => row.player_id === playerId);
    }
    return rows
      .map(makeSessionRow)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  const values = [orgId, sessionId];
  let condition = "org_id = $1 AND session_id = $2";
  if (playerId) {
    values.push(playerId);
    condition += ` AND player_id = $${values.length}`;
  }

  const result = await query(
    `SELECT id, org_id, session_id, player_id, block_id, score, notes, created_at, updated_at
     FROM player_evaluations
     WHERE ${condition}
     ORDER BY created_at ASC`,
    values
  );
  return result.rows.map(makeSessionRow);
}

export async function listSessionPlayerEvaluations({ orgId, sessionId }) {
  return fetchSessionEvaluations({ orgId, sessionId });
}

export async function listSessionScores({ orgId, sessionId }) {
  return fetchSessionEvaluations({ orgId, sessionId });
}

export async function listSessionScoresByPlayer({ orgId, sessionId, playerId }) {
  if (!playerId) throw new Error("playerId required");
  return fetchSessionEvaluations({ orgId, sessionId, playerId });
}

export async function updateSessionPlayerEvaluation({
  orgId,
  sessionId,
  playerEvaluationId,
  score,
  notes,
}) {
  if (!orgId || !sessionId || !playerEvaluationId) throw new Error("missing identifiers");

  if (!hasDatabase()) {
    const existing = memorySessionEvaluations.get(playerEvaluationId);
    if (!existing) return null;
    if (existing.org_id !== orgId || existing.session_id !== sessionId) return null;
    existing.score = score;
    existing.notes = notes;
    existing.updated_at = new Date().toISOString();
    memorySessionEvaluations.set(playerEvaluationId, existing);
    return makeSessionRow(existing);
  }

  const result = await query(
    `UPDATE player_evaluations
     SET score = $4,
         notes = $5,
         updated_at = NOW()
     WHERE org_id = $1 AND session_id = $2 AND id = $3
     RETURNING id, org_id, session_id, player_id, block_id, score, notes, created_at, updated_at`,
    [orgId, sessionId, playerEvaluationId, score, notes]
  );
  if (!result.rows.length) return null;
  return makeSessionRow(result.rows[0]);
}

export async function createSessionEvaluationLog({ playerEvaluationId, previousScore, newScore, editedByUserId }) {
  if (!playerEvaluationId) throw new Error("playerEvaluationId required");

  if (!hasDatabase()) {
    const row = {
      id: crypto.randomUUID(),
      player_evaluation_id: playerEvaluationId,
      previous_score: previousScore,
      new_score: newScore,
      edited_by_user_id: editedByUserId ?? null,
      edited_at: new Date().toISOString(),
    };
    memoryLogs.push(row);
    return row;
  }

  const result = await query(
    `INSERT INTO evaluation_logs (
       player_evaluation_id,
       previous_score,
       new_score,
       edited_by_user_id
     )
     VALUES ($1,$2,$3,$4)
     RETURNING id, player_evaluation_id, previous_score, new_score, edited_by_user_id, edited_at`,
    [playerEvaluationId, previousScore, newScore, editedByUserId ?? null]
  );
  return result.rows[0];
}

export async function listSessionEvaluationLogs({ playerEvaluationId }) {
  if (!playerEvaluationId) return [];

  if (!hasDatabase()) {
    return memoryLogs
      .filter((log) => log.player_evaluation_id === playerEvaluationId)
      .sort((a, b) => new Date(a.edited_at) - new Date(b.edited_at));
  }

  const result = await query(
    `SELECT id, player_evaluation_id, previous_score, new_score, edited_by_user_id, edited_at
     FROM evaluation_logs
     WHERE player_evaluation_id = $1
     ORDER BY edited_at ASC`,
    [playerEvaluationId]
  );
  return result.rows;
}
