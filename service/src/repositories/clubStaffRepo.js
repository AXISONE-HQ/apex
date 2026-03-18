import { hasDatabase, query } from "../db/client.js";

export async function listCoachesByOrg(orgId) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    // In memory / demo mode we do not maintain membership rosters.
    return [];
  }

  const result = await query(
    `SELECT
       u.id,
       u.name,
       u.email,
       array_agg(DISTINCT r.code) AS roles
     FROM memberships m
     JOIN membership_roles mr ON mr.membership_id = m.id
     JOIN roles r ON r.id = mr.role_id
     JOIN users u ON u.id = m.user_id
     WHERE m.org_id = $1
       AND r.code IN ('ManagerCoach', 'OrgAdmin')
     GROUP BY u.id, u.name, u.email
     ORDER BY lower(COALESCE(u.name, '')) ASC, lower(COALESCE(u.email, '')) ASC`,
    [orgId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roles: Array.isArray(row.roles) ? row.roles.filter(Boolean) : [],
  }));
}
