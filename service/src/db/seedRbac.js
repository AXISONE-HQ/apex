import { hasDatabase, query } from "./client.js";
import { rolePermissions } from "../config/rbac.js";
import { permissionCatalog } from "../config/permissions.js";

export async function seedRbac() {
  if (!hasDatabase()) return { applied: false, reason: "DATABASE_URL not set" };

  for (const permission of permissionCatalog) {
    await query(`INSERT INTO permissions (code) VALUES ($1) ON CONFLICT (code) DO NOTHING`, [permission]);
  }

  const roleIds = {};
  for (const role of Object.keys(rolePermissions)) {
    const roleRow = await query(
      `INSERT INTO roles (code) VALUES ($1)
       ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
       RETURNING id, code`,
      [role]
    );
    roleIds[role] = roleRow.rows[0].id;
  }

  for (const [role, grants] of Object.entries(rolePermissions)) {
    const roleId = roleIds[role];
    for (const grant of grants) {
      if (grant === "*" || grant.endsWith(".*")) continue;
      await query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, p.id FROM permissions p WHERE p.code = $2
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, grant]
      );
    }
  }

  return { applied: true, roles: Object.keys(rolePermissions).length, permissions: permissionCatalog.length };
}
