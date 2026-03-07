import { hasDatabase, query } from "../db/client.js";

const memoryPlayers = new Map();
let memorySeq = 1;

function makeMemoryId() {
  return `player_${memorySeq++}`;
}

export async function createPlayer({
  orgId,
  teamId = null,
  firstName,
  lastName,
  displayName = null,
  jerseyNumber = null,
  birthYear = null,
  position = null,
  status = "active",
  notes = null,
}) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const id = makeMemoryId();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      team_id: teamId ? String(teamId) : null,
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      jersey_number: jerseyNumber,
      birth_year: birthYear,
      position,
      status,
      notes,
      created_at: now,
      updated_at: now,
    };
    memoryPlayers.set(id, row);
    return row;
  }

  const result = await query(
    `INSERT INTO players (
       org_id,
       team_id,
       first_name,
       last_name,
       display_name,
       jersey_number,
       birth_year,
       position,
       status,
       notes
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING
       id, org_id, team_id, first_name, last_name, display_name,
       jersey_number, birth_year, position, status, notes,
       created_at, updated_at`,
    [
      orgId,
      teamId ?? null,
      firstName,
      lastName,
      displayName,
      jerseyNumber,
      birthYear,
      position,
      status,
      notes,
    ]
  );

  return result.rows[0];
}

export async function listPlayersByOrg(orgId) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const rows = Array.from(memoryPlayers.values()).filter(
      (p) => String(p.org_id) === String(orgId)
    );
    return rows.sort((a, b) => {
      const last = a.last_name.localeCompare(b.last_name);
      if (last !== 0) return last;
      const first = a.first_name.localeCompare(b.first_name);
      if (first !== 0) return first;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  const result = await query(
    `SELECT id, org_id, team_id, first_name, last_name, display_name,
            jersey_number, birth_year, position, status, notes,
            created_at, updated_at
     FROM players
     WHERE org_id = $1
     ORDER BY last_name ASC, first_name ASC, created_at ASC`,
    [orgId]
  );

  return result.rows;
}

export async function listPlayersByTeam(orgId, teamId) {
  if (!orgId) throw new Error("orgId required");
  if (!teamId) throw new Error("teamId required");

  if (!hasDatabase()) {
    const rows = Array.from(memoryPlayers.values()).filter(
      (p) => String(p.org_id) === String(orgId) && String(p.team_id) === String(teamId)
    );
    return rows.sort((a, b) => {
      const last = a.last_name.localeCompare(b.last_name);
      if (last !== 0) return last;
      const first = a.first_name.localeCompare(b.first_name);
      if (first !== 0) return first;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  const result = await query(
    `SELECT id, org_id, team_id, first_name, last_name, display_name,
            jersey_number, birth_year, position, status, notes,
            created_at, updated_at
     FROM players
     WHERE org_id = $1 AND team_id = $2
     ORDER BY last_name ASC, first_name ASC, created_at ASC`,
    [orgId, teamId]
  );

  return result.rows;
}

export async function listUnassignedPlayersByOrg(orgId) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const rows = Array.from(memoryPlayers.values()).filter(
      (p) => String(p.org_id) === String(orgId) && (p.team_id === null || p.team_id === undefined)
    );
    return rows.sort((a, b) => {
      const last = a.last_name.localeCompare(b.last_name);
      if (last !== 0) return last;
      const first = a.first_name.localeCompare(b.first_name);
      if (first !== 0) return first;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  const result = await query(
    `SELECT id, org_id, team_id, first_name, last_name, display_name,
            jersey_number, birth_year, position, status, notes,
            created_at, updated_at
     FROM players
     WHERE org_id = $1 AND team_id IS NULL
     ORDER BY last_name ASC, first_name ASC, created_at ASC`,
    [orgId]
  );

  return result.rows;
}

export async function getPlayerByIdAndOrg(playerId, orgId) {
  if (!playerId || !orgId) throw new Error("playerId and orgId required");

  if (!hasDatabase()) {
    const row = memoryPlayers.get(playerId);
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return row;
  }

  const result = await query(
    `SELECT id, org_id, team_id, first_name, last_name, display_name,
            jersey_number, birth_year, position, status, notes,
            created_at, updated_at
     FROM players
     WHERE id = $1 AND org_id = $2
     LIMIT 1`,
    [playerId, orgId]
  );

  return result.rows[0] || null;
}

export async function updatePlayer(playerId, orgId, patch = {}) {
  if (!playerId || !orgId) throw new Error("playerId and orgId required");

  if (!hasDatabase()) {
    const existing = memoryPlayers.get(playerId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...patch,
      org_id: existing.org_id,
      id: existing.id,
      updated_at: now,
    };
    memoryPlayers.set(playerId, updated);
    return updated;
  }

  const entries = Object.entries(patch || {});
  if (!entries.length) throw new Error("no_updatable_fields");

  const set = [];
  const values = [playerId, orgId];
  let i = 3;

  for (const [key, value] of entries) {
    set.push(`${key} = $${i++}`);
    values.push(value);
  }

  set.push(`updated_at = NOW()`);

  const result = await query(
    `UPDATE players
     SET ${set.join(", ")}
     WHERE id = $1 AND org_id = $2
     RETURNING id, org_id, team_id, first_name, last_name, display_name,
               jersey_number, birth_year, position, status, notes,
               created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}

export async function assignPlayerTeam(playerId, orgId, teamId) {
  if (!playerId || !orgId) throw new Error("playerId and orgId required");

  if (!hasDatabase()) {
    const existing = memoryPlayers.get(playerId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      team_id: teamId ? String(teamId) : null,
      updated_at: now,
    };
    memoryPlayers.set(playerId, updated);
    return updated;
  }

  const result = await query(
    `UPDATE players
     SET team_id = $3, updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING id, org_id, team_id, first_name, last_name, display_name,
               jersey_number, birth_year, position, status, notes,
               created_at, updated_at`,
    [playerId, orgId, teamId ?? null]
  );

  return result.rows[0] || null;
}

export async function clearPlayerTeam(playerId, orgId) {
  if (!playerId || !orgId) throw new Error("playerId and orgId required");

  if (!hasDatabase()) {
    const existing = memoryPlayers.get(playerId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      team_id: null,
      updated_at: now,
    };
    memoryPlayers.set(playerId, updated);
    return updated;
  }

  const result = await query(
    `UPDATE players
     SET team_id = NULL, updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING id, org_id, team_id, first_name, last_name, display_name,
               jersey_number, birth_year, position, status, notes,
               created_at, updated_at`,
    [playerId, orgId]
  );

  return result.rows[0] || null;
}

export async function setPlayerStatus(playerId, orgId, status) {
  if (!playerId || !orgId) throw new Error("playerId and orgId required");
  if (!status) throw new Error("status required");

  if (!hasDatabase()) {
    const existing = memoryPlayers.get(playerId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      status,
      updated_at: now,
    };
    memoryPlayers.set(playerId, updated);
    return updated;
  }

  const result = await query(
    `UPDATE players
     SET status = $3, updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING id, org_id, team_id, first_name, last_name, display_name,
               jersey_number, birth_year, position, status, notes,
               created_at, updated_at`,
    [playerId, orgId, status]
  );

  return result.rows[0] || null;
}

export async function deletePlayer(orgId, playerId) {
  if (!playerId || !orgId) throw new Error("playerId and orgId required");

  if (!hasDatabase()) {
    const existing = memoryPlayers.get(playerId);
    if (!existing) return false;
    if (String(existing.org_id) !== String(orgId)) return false;
    memoryPlayers.delete(playerId);
    return true;
  }

  const result = await query(
    `DELETE FROM players
     WHERE id = $1 AND org_id = $2`,
    [playerId, orgId]
  );

  return result.rowCount > 0;
}
