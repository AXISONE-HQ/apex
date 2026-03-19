import { hasDatabase, query } from "../db/client.js";

export async function ensureMembershipRole({ userId, orgId, roleCode }) {
  if (!hasDatabase()) {
    return { ok: true };
  }

  const membership = await query(
    `INSERT INTO memberships (user_id, org_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, org_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING id`,
    [userId, orgId]
  );

  const role = await query(
    `INSERT INTO roles (code)
     VALUES ($1)
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING id`,
    [roleCode]
  );

  await query(
    `INSERT INTO membership_roles (membership_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (membership_id, role_id) DO NOTHING`,
    [membership.rows[0].id, role.rows[0].id]
  );

  return { ok: true, membershipId: membership.rows[0].id };
}

export async function getMembershipByOrgAndUserId({ orgId, userId }) {
  if (!orgId || !userId) return null;

  if (!hasDatabase()) {
    // In non-DB mode, membership details are embedded in req.user headers.
    return null;
  }

  const result = await query(
    `SELECT r.code AS role_code
     FROM memberships m
     LEFT JOIN membership_roles mr ON mr.membership_id = m.id
     LEFT JOIN roles r ON r.id = mr.role_id
     WHERE m.org_id = $1 AND m.user_id = $2
     LIMIT 1`,
    [orgId, userId]
  );

  if (!result.rows.length) return null;

  return {
    orgId,
    userId,
    roleCode: result.rows[0].role_code || null,
  };
}
