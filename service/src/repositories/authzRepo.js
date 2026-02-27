import { rolePermissions } from "../config/rbac.js";
import { hasDatabase, query } from "../db/client.js";

function expandWildcardGrants(grants = [], knownPermissions = []) {
  const out = new Set();
  for (const grant of grants) {
    if (grant === "*") {
      for (const p of knownPermissions) out.add(p);
      continue;
    }
    if (grant.endsWith(".*")) {
      const prefix = grant.slice(0, -1);
      for (const p of knownPermissions) {
        if (p.startsWith(prefix)) out.add(p);
      }
      continue;
    }
    out.add(grant);
  }
  return [...out];
}

export async function ensureDefaultOrgMembership({ userId }) {
  if (!hasDatabase()) return { orgId: "org_demo", role: "ManagerCoach" };

  const org = await query(
    `INSERT INTO organizations (name, slug)
     VALUES ('Demo Org', 'demo-org')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    []
  );
  const orgId = org.rows[0].id;

  const membership = await query(
    `INSERT INTO memberships (user_id, org_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, org_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING id`,
    [userId, orgId]
  );

  const role = await query(
    `INSERT INTO roles (code)
     VALUES ('ManagerCoach')
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING id`,
    []
  );

  await query(
    `INSERT INTO membership_roles (membership_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (membership_id, role_id) DO NOTHING`,
    [membership.rows[0].id, role.rows[0].id]
  );

  return { orgId, role: "ManagerCoach" };
}

export async function resolveAuthzForUser({ userId, orgId = null }) {
  if (!hasDatabase()) {
    return { roles: ["Viewer"], permissions: ["dashboard.page.view"], activeOrgId: orgId || "org_demo", orgScopes: ["org_demo"], teamScopes: [] };
  }

  const permissionsRows = await query(`SELECT code FROM permissions`);
  const knownPermissions = permissionsRows.rows.map((r) => r.code);

  const roleRows = await query(
    `SELECT r.code, m.org_id
     FROM memberships m
     JOIN membership_roles mr ON mr.membership_id = m.id
     JOIN roles r ON r.id = mr.role_id
     WHERE m.user_id = $1
       AND ($2::uuid IS NULL OR m.org_id = $2::uuid)`,
    [userId, orgId]
  );

  const roles = roleRows.rows.map((r) => r.code);
  const orgScopes = [...new Set(roleRows.rows.map((r) => r.org_id))];
  if (!roles.length) {
    return {
      roles: ["Viewer"],
      permissions: ["dashboard.page.view"],
      activeOrgId: orgId,
      orgScopes: orgId ? [orgId] : [],
      teamScopes: []
    };
  }

  // Use rolePermissions config as source of truth for wildcard grants,
  // while DB role/permission tables hold explicit assignment structure.
  const grants = roles.flatMap((role) => rolePermissions[role] || []);
  const permissions = expandWildcardGrants(grants, knownPermissions);

  return {
    roles,
    permissions,
    activeOrgId: orgId || orgScopes[0] || null,
    orgScopes,
    teamScopes: []
  };
}
