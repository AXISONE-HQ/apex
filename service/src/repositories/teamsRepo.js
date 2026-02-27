import { hasDatabase, query } from "../db/client.js";

const teams = [];

export async function listTeamsByOrg(orgId, { limit = 20, offset = 0 } = {}) {
  if (!hasDatabase()) {
    return teams
      .filter((t) => t.orgId === orgId)
      .slice(offset, offset + limit);
  }

  const result = await query(
    `SELECT id, org_id, name, code, created_at, updated_at
     FROM teams WHERE org_id = $1 ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [orgId, limit, offset]
  );
  return result.rows;
}

export async function createTeam({ orgId, name, code = null }) {
  if (!hasDatabase()) {
    const team = { id: `team_${teams.length + 1}`, orgId, name, code, created_at: new Date().toISOString() };
    teams.push(team);
    return team;
  }

  const result = await query(
    `INSERT INTO teams (org_id, name, code)
     VALUES ($1, $2, $3)
     RETURNING id, org_id, name, code, created_at, updated_at`,
    [orgId, name, code]
  );
  return result.rows[0];
}

export async function updateTeam({ orgId, teamId, name, code }) {
  if (!hasDatabase()) {
    const idx = teams.findIndex((t) => t.id === teamId && t.orgId === orgId);
    if (idx === -1) return null;
    teams[idx] = { ...teams[idx], ...(name !== undefined ? { name } : {}), ...(code !== undefined ? { code } : {}) };
    return teams[idx];
  }

  const result = await query(
    `UPDATE teams
     SET name = COALESCE($3, name),
         code = COALESCE($4, code),
         updated_at = NOW()
     WHERE org_id = $1 AND id = $2
     RETURNING id, org_id, name, code, created_at, updated_at`,
    [orgId, teamId, name ?? null, code ?? null]
  );
  return result.rows[0] || null;
}

export async function deleteTeam({ orgId, teamId }) {
  if (!hasDatabase()) {
    const before = teams.length;
    const filtered = teams.filter((t) => !(t.id === teamId && t.orgId === orgId));
    teams.length = 0;
    teams.push(...filtered);
    return before !== teams.length;
  }

  const result = await query(`DELETE FROM teams WHERE org_id = $1 AND id = $2`, [orgId, teamId]);
  return result.rowCount > 0;
}
