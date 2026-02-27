import { hasDatabase, query } from "../db/client.js";

const players = [];

export async function listPlayersByOrg(orgId) {
  if (!hasDatabase()) return players.filter((p) => p.orgId === orgId);

  const result = await query(
    `SELECT id, org_id, team_id, first_name, last_name, email, status, created_at, updated_at
     FROM players WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

export async function createPlayer({ orgId, firstName, lastName, email = null, teamId = null }) {
  if (!hasDatabase()) {
    const player = {
      id: `player_${players.length + 1}`,
      orgId,
      teamId,
      firstName,
      lastName,
      email,
      status: "active",
      created_at: new Date().toISOString()
    };
    players.push(player);
    return player;
  }

  const result = await query(
    `INSERT INTO players (org_id, team_id, first_name, last_name, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, org_id, team_id, first_name, last_name, email, status, created_at, updated_at`,
    [orgId, teamId, firstName, lastName, email]
  );
  return result.rows[0];
}

export async function updatePlayer({ orgId, playerId, firstName, lastName, email, teamId, status }) {
  if (!hasDatabase()) {
    const idx = players.findIndex((p) => p.id === playerId && p.orgId === orgId);
    if (idx === -1) return null;
    players[idx] = {
      ...players[idx],
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(teamId !== undefined ? { teamId } : {}),
      ...(status !== undefined ? { status } : {})
    };
    return players[idx];
  }

  const result = await query(
    `UPDATE players
     SET first_name = COALESCE($3, first_name),
         last_name = COALESCE($4, last_name),
         email = COALESCE($5, email),
         team_id = COALESCE($6, team_id),
         status = COALESCE($7, status),
         updated_at = NOW()
     WHERE org_id = $1 AND id = $2
     RETURNING id, org_id, team_id, first_name, last_name, email, status, created_at, updated_at`,
    [orgId, playerId, firstName ?? null, lastName ?? null, email ?? null, teamId ?? null, status ?? null]
  );
  return result.rows[0] || null;
}

export async function deletePlayer({ orgId, playerId }) {
  if (!hasDatabase()) {
    const before = players.length;
    const filtered = players.filter((p) => !(p.id === playerId && p.orgId === orgId));
    players.length = 0;
    players.push(...filtered);
    return before !== players.length;
  }

  const result = await query(`DELETE FROM players WHERE org_id = $1 AND id = $2`, [orgId, playerId]);
  return result.rowCount > 0;
}
