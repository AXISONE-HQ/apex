import { hasDatabase, query } from "../db/client.js";

const memoryAttendance = new Map(); // key: `${playerId}:${eventId}`
let attendanceSeq = 1;

function makeMemoryId() {
  return `attendance_${attendanceSeq++}`;
}

export async function upsertPlayerAttendance({
  orgId,
  eventId,
  playerId,
  status,
  notes = null,
  recordedBy = null,
}) {
  if (!orgId || !eventId || !playerId) throw new Error("orgId, eventId, playerId required");

  if (!hasDatabase()) {
    const key = `${playerId}:${eventId}`;
    const now = new Date().toISOString();
    const existing = memoryAttendance.get(key);
    if (existing) {
      const updated = {
        ...existing,
        status,
        notes,
        recorded_by_user_id: recordedBy,
        updated_at: now,
      };
      memoryAttendance.set(key, updated);
      return updated;
    }

    const row = {
      id: makeMemoryId(),
      org_id: String(orgId),
      event_id: String(eventId),
      player_id: String(playerId),
      status,
      notes,
      recorded_by_user_id: recordedBy,
      created_at: now,
      updated_at: now,
    };
    memoryAttendance.set(key, row);
    return row;
  }

  const result = await query(
    `INSERT INTO player_attendance (
       org_id,
       event_id,
       player_id,
       status,
       notes,
       recorded_by_user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (player_id, event_id)
     DO UPDATE SET status = EXCLUDED.status,
                   notes = EXCLUDED.notes,
                   recorded_by_user_id = EXCLUDED.recorded_by_user_id,
                   updated_at = NOW()
     RETURNING id, org_id, event_id, player_id, status, notes,
               recorded_by_user_id, created_at, updated_at`,
    [orgId, eventId, playerId, status, notes, recordedBy]
  );

  return result.rows[0];
}

export async function listAttendanceByEvent({ orgId, eventId }) {
  if (!orgId || !eventId) throw new Error("orgId and eventId required");

  if (!hasDatabase()) {
    return Array.from(memoryAttendance.values())
      .filter((row) => row.org_id === String(orgId) && row.event_id === String(eventId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  const result = await query(
    `SELECT id, org_id, event_id, player_id, status, notes,
            recorded_by_user_id, created_at, updated_at
     FROM player_attendance
     WHERE org_id = $1 AND event_id = $2
     ORDER BY created_at ASC`,
    [orgId, eventId]
  );

  return result.rows;
}

export async function listAttendanceByPlayer({ orgId, playerId }) {
  if (!orgId || !playerId) throw new Error("orgId and playerId required");

  if (!hasDatabase()) {
    return Array.from(memoryAttendance.values())
      .filter((row) => row.org_id === String(orgId) && row.player_id === String(playerId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  const result = await query(
    `SELECT id, org_id, event_id, player_id, status, notes,
            recorded_by_user_id, created_at, updated_at
     FROM player_attendance
     WHERE org_id = $1 AND player_id = $2
     ORDER BY created_at ASC`,
    [orgId, playerId]
  );

  return result.rows;
}
