import { hasDatabase, query } from "../db/client.js";

const demoAttendance = new Map(); // key: `${eventId}:${playerId}` => row

export async function listAttendanceByEvent({ eventId }) {
  if (!hasDatabase()) {
    return Array.from(demoAttendance.values()).filter((r) => r.eventId === eventId);
  }

  const result = await query(
    `SELECT event_id, player_id, status, note, updated_by, updated_at
     FROM event_attendance
     WHERE event_id = $1
     ORDER BY player_id ASC`,
    [eventId]
  );

  return result.rows;
}

export async function upsertAttendance({ eventId, playerId, status, note = null, updatedBy = null }) {
  if (!hasDatabase()) {
    const key = `${eventId}:${playerId}`;
    const row = {
      eventId,
      playerId,
      status,
      note,
      updatedBy,
      updatedAt: new Date().toISOString()
    };
    demoAttendance.set(key, row);
    return row;
  }

  const result = await query(
    `INSERT INTO event_attendance (event_id, player_id, status, note, updated_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id, player_id)
     DO UPDATE SET status = EXCLUDED.status,
                   note = EXCLUDED.note,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW()
     RETURNING event_id, player_id, status, note, updated_by, updated_at`,
    [eventId, playerId, status, note, updatedBy]
  );

  return result.rows[0];
}
