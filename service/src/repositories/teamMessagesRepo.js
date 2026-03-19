import { hasDatabase, query } from "../db/client.js";

const demoTeamMessages = [];

export async function listTeamMessages({ orgId, teamId, limit = 50 } = {}) {
  if (!orgId || !teamId) return [];

  if (!hasDatabase()) {
    return demoTeamMessages
      .filter((m) => m.orgId === orgId && m.teamId === teamId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  const result = await query(
    `SELECT id, org_id, team_id, user_id, body, created_at
     FROM team_messages
     WHERE org_id = $1 AND team_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [orgId, teamId, limit]
  );

  return result.rows;
}

export async function createTeamMessage({ orgId, teamId, userId = null, body } = {}) {
  if (!orgId || !teamId || !body) {
    throw new Error("orgId, teamId, and body are required");
  }

  if (!hasDatabase()) {
    const m = {
      id: `team_message_${demoTeamMessages.length + 1}`,
      orgId,
      teamId,
      userId,
      body,
      createdAt: new Date().toISOString(),
    };
    demoTeamMessages.unshift(m);
    return m;
  }

  const result = await query(
    `INSERT INTO team_messages (org_id, team_id, user_id, body)
     VALUES ($1,$2,$3,$4)
     RETURNING id, org_id, team_id, user_id, body, created_at`,
    [orgId, teamId, userId, body]
  );

  return result.rows[0];
}
