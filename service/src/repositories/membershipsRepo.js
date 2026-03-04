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
