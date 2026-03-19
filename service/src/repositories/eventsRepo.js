import { hasDatabase, query } from "../db/client.js";

const demoEvents = [];
const demoEventGames = new Map();

function attachGameFieldsToRow(row, game = null) {
  if (!game) return row;
  return {
    ...row,
    game_opponent_name: game.opponent_name ?? null,
    game_location_type: game.location_type ?? null,
    game_game_type: game.game_type ?? null,
    game_uniform_color: game.uniform_color ?? null,
    game_arrival_time: game.arrival_time ?? null,
  };
}

export async function listEvents({ orgId, teamId = null, teamIds = null, from = null, to = null, limit = 200 } = {}) {
  if (!orgId) throw new Error("orgId required");

  const teamFilter = teamIds ? Array.from(new Set(teamIds)) : teamId ? [teamId] : null;

  if (!hasDatabase()) {
    return demoEvents
      .filter((e) => e.orgId === orgId && (!teamFilter || teamFilter.includes(e.teamId)))
      .filter((e) => {
        const startsAt = new Date(e.startsAt).getTime();
        if (Number.isNaN(startsAt)) return false;
        if (from && startsAt < new Date(from).getTime()) return false;
        if (to && startsAt > new Date(to).getTime()) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      .map((event) => attachGameFieldsToRow(event, demoEventGames.get(event.id)));
  }

  const params = [orgId];
  let where = "e.org_id = $1";

  if (teamFilter && teamFilter.length === 1) {
    params.push(teamFilter[0]);
    where += ` AND e.team_id = $${params.length}`;
  } else if (teamFilter && teamFilter.length > 1) {
    params.push(teamFilter);
    where += ` AND e.team_id = ANY($${params.length})`;
  }

  if (from) {
    params.push(from);
    where += ` AND e.starts_at >= $${params.length}`;
  }

  if (to) {
    params.push(to);
    where += ` AND e.starts_at <= $${params.length}`;
  }

  params.push(limit);

  const result = await query(
    `SELECT
       e.id,
       e.org_id,
       e.team_id,
       e.title,
       e.type,
       e.starts_at,
       e.ends_at,
       e.location,
       e.notes,
       e.created_by,
       e.created_at,
       e.updated_at,
       eg.opponent_name AS game_opponent_name,
       eg.location_type AS game_location_type,
       eg.game_type AS game_game_type,
       eg.uniform_color AS game_uniform_color,
       eg.arrival_time AS game_arrival_time
     FROM events e
     LEFT JOIN event_games eg ON eg.event_id = e.id
     WHERE ${where}
     ORDER BY e.starts_at ASC
     LIMIT $${params.length}`,
    params
  );

  return result.rows;
}

export async function getEventById({ id, orgId }) {
  if (!hasDatabase()) {
    const event = demoEvents.find((e) => e.id === id && e.orgId === orgId) || null;
    if (!event) return null;
    return attachGameFieldsToRow(event, demoEventGames.get(event.id));
  }

  const result = await query(
    `SELECT
       e.id,
       e.org_id,
       e.team_id,
       e.title,
       e.type,
       e.starts_at,
       e.ends_at,
       e.location,
       e.notes,
       e.created_by,
       e.created_at,
       e.updated_at,
       eg.opponent_name AS game_opponent_name,
       eg.location_type AS game_location_type,
       eg.game_type AS game_game_type,
       eg.uniform_color AS game_uniform_color,
       eg.arrival_time AS game_arrival_time
     FROM events e
     LEFT JOIN event_games eg ON eg.event_id = e.id
     WHERE e.id = $1 AND e.org_id = $2`,
    [id, orgId]
  );

  return result.rows[0] || null;
}

export async function createEvent({
  orgId,
  teamId,
  title,
  type,
  startsAt,
  endsAt = null,
  location = null,
  notes = null,
  createdBy = null,
  gameDetails = null,
}) {
  if (!teamId) {
    const err = new Error("team_id is required to create an event");
    err.code = "VALIDATION";
    throw err;
  }

  if (!hasDatabase()) {
    const event = {
      id: `event_${demoEvents.length + 1}`,
      orgId,
      teamId,
      title,
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
    if (gameDetails) {
      demoEventGames.set(event.id, { ...gameDetails });
      return attachGameFieldsToRow(event, gameDetails);
    }
    return event;
  }

  const result = await query(
    `INSERT INTO events (org_id, team_id, title, type, starts_at, ends_at, location, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, org_id, team_id, title, type, starts_at, ends_at, location, notes, created_by, created_at, updated_at`,
    [orgId, teamId, title, type, startsAt, endsAt, location, notes, createdBy]
  );
  const eventRow = result.rows[0];

  if (gameDetails) {
    await query(
      `INSERT INTO event_games (
         event_id,
         opponent_name,
         location_type,
         game_type,
         uniform_color,
         arrival_time
       )
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (event_id) DO UPDATE SET
         opponent_name = EXCLUDED.opponent_name,
         location_type = EXCLUDED.location_type,
         game_type = EXCLUDED.game_type,
         uniform_color = EXCLUDED.uniform_color,
         arrival_time = EXCLUDED.arrival_time,
         updated_at = NOW()`,
      [
        eventRow.id,
        gameDetails.opponent_name,
        gameDetails.location_type,
        gameDetails.game_type,
        gameDetails.uniform_color,
        gameDetails.arrival_time,
      ]
    );
    return {
      ...eventRow,
      game_opponent_name: gameDetails.opponent_name,
      game_location_type: gameDetails.location_type,
      game_game_type: gameDetails.game_type,
      game_uniform_color: gameDetails.uniform_color,
      game_arrival_time: gameDetails.arrival_time,
    };
  }

  return eventRow;
}

export async function updateEvent({ id, orgId, patch = {} }) {
  if (!hasDatabase()) {
    const idx = demoEvents.findIndex((e) => e.id === id && e.orgId === orgId);
    if (idx === -1) return null;
    demoEvents[idx] = { ...demoEvents[idx], ...patch, updatedAt: new Date().toISOString() };
    return attachGameFieldsToRow(demoEvents[idx], demoEventGames.get(id));
  }

  const fields = [];
  const values = [];
  const allowed = {
    title: "title",
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
    const existing = await getEventById({ id, orgId });
    return existing;
  }

  values.push(id);
  values.push(orgId);

  const result = await query(
    `UPDATE events
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND org_id = $${values.length}
     RETURNING id, org_id, team_id, title, type, starts_at, ends_at, location, notes, created_by, created_at, updated_at`,
    values
  );

  const row = result.rows[0] || null;
  if (!row) return null;

  const game = await query(
    `SELECT opponent_name AS game_opponent_name,
            location_type AS game_location_type,
            game_type AS game_game_type,
            uniform_color AS game_uniform_color,
            arrival_time AS game_arrival_time
     FROM event_games
     WHERE event_id = $1`,
    [row.id]
  );

  return {
    ...row,
    ...game.rows[0],
  };
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
