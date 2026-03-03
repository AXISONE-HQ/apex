import { hasDatabase, query } from "../db/client.js";

const demoEvents = [];

export async function listEvents({ orgId, teamId, from = null, to = null, limit = 200 } = {}) {
  if (!hasDatabase()) {
    return demoEvents.filter((e) => e.orgId === orgId && e.teamId === teamId);
  }

  const params = [orgId, teamId];
  let where = "org_id = $1 AND team_id = $2";

  if (from) {
    params.push(from);
    where += ` AND starts_at >= $${params.length}`;
  }

  if (to) {
    params.push(to);
    where += ` AND starts_at <= $${params.length}`;
  }

  params.push(limit);

  const result = await query(
    `SELECT id, org_id, team_id, type, starts_at, ends_at, location, notes, created_by, created_at, updated_at
     FROM events
     WHERE ${where}
     ORDER BY starts_at ASC
     LIMIT $${params.length}`,
    params
  );

  return result.rows;
}

export async function getEventById({ id, orgId }) {
  if (!hasDatabase()) {
    return demoEvents.find((e) => e.id === id && e.orgId === orgId) || null;
  }

  const result = await query(
    `SELECT id, org_id, team_id, type, starts_at, ends_at, location, notes, created_by, created_at, updated_at
     FROM events
     WHERE id = $1 AND org_id = $2`,
    [id, orgId]
  );

  return result.rows[0] || null;
}

export async function createEvent({ orgId, teamId, type, startsAt, endsAt = null, location = null, notes = null, createdBy = null }) {
  if (!hasDatabase()) {
    const event = {
      id: `event_${demoEvents.length + 1}`,
      orgId,
      teamId,
      type,
      startsAt,
      endsAt,
      location,
      notes,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    demoEvents.push(event);
    return event;
  }

  const result = await query(
    `INSERT INTO events (org_id, team_id, type, starts_at, ends_at, location, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, org_id, team_id, type, starts_at, ends_at, location, notes, created_by, created_at, updated_at`,
    [orgId, teamId, type, startsAt, endsAt, location, notes, createdBy]
  );
  return result.rows[0];
}

export async function updateEvent({ id, orgId, patch = {} }) {
  if (!hasDatabase()) {
    const idx = demoEvents.findIndex((e) => e.id === id && e.orgId === orgId);
    if (idx === -1) return null;
    demoEvents[idx] = { ...demoEvents[idx], ...patch, updatedAt: new Date().toISOString() };
    return demoEvents[idx];
  }

  const fields = [];
  const values = [];
  const allowed = {
    type: "type",
    starts_at: "starts_at",
    ends_at: "ends_at",
    location: "location",
    notes: "notes"
  };

  for (const [k, col] of Object.entries(allowed)) {
    if (patch[k] !== undefined) {
      values.push(patch[k]);
      fields.push(`${col} = $${values.length}`);
    }
  }

  if (!fields.length) {
    const existing = await query(
      `SELECT id, org_id, team_id, type, starts_at, ends_at, location, notes, created_by, created_at, updated_at
       FROM events WHERE id = $1 AND org_id = $2`,
      [id, orgId]
    );
    return existing.rows[0] || null;
  }

  values.push(id);
  values.push(orgId);

  const result = await query(
    `UPDATE events
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND org_id = $${values.length}
     RETURNING id, org_id, team_id, type, starts_at, ends_at, location, notes, created_by, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}

export async function deleteEvent({ id, orgId }) {
  if (!hasDatabase()) {
    const idx = demoEvents.findIndex((e) => e.id === id && e.orgId === orgId);
    if (idx === -1) return false;
    demoEvents.splice(idx, 1);
    return true;
  }

  const result = await query("DELETE FROM events WHERE id = $1 AND org_id = $2", [id, orgId]);
  return result.rowCount > 0;
}

// Reminders job helper (DB-only): list upcoming events in a time window.
// Note: events currently have no status column; all events are treated as scheduled.
export async function listUpcomingScheduledEventsForOrg({ from, to, limit = 500 } = {}) {
  if (!hasDatabase()) return [];

  const params = [from, to, limit];
  const result = await query(
    `SELECT id, org_id, team_id, type, starts_at
     FROM events
     WHERE starts_at >= $1 AND starts_at <= $2
     ORDER BY starts_at ASC
     LIMIT $3`,
    params
  );
  return result.rows;
}
