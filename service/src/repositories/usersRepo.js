import { hasDatabase, query } from "../db/client.js";

const users = new Map();

export async function upsertUserFromIdentity(identity) {
  if (!hasDatabase()) {
    const key = identity.uid;
    const existing = users.get(key) || {
      id: key,
      externalUid: identity.uid,
      email: identity.email,
      name: identity.name || "",
      roles: ["Viewer"],
      permissions: ["dashboard.page.view"],
      orgScopes: ["org_demo"],
      teamScopes: []
    };

    const updated = {
      ...existing,
      email: identity.email || existing.email,
      name: identity.name || existing.name
    };
    users.set(key, updated);
    return updated;
  }

  const upsert = await query(
    `INSERT INTO users (external_uid, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (external_uid)
     DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, updated_at = NOW()
     RETURNING id, external_uid, email, name`,
    [identity.uid, identity.email, identity.name || ""]
  );

  const row = upsert.rows[0];
  return {
    id: row.id,
    externalUid: row.external_uid,
    email: row.email,
    name: row.name,
    orgScopes: [],
    teamScopes: []
  };
}

export async function getUserById(id) {
  if (!hasDatabase()) return users.get(id) || null;

  const result = await query(
    `SELECT id, external_uid, email, name FROM users WHERE id = $1`,
    [id]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return { id: row.id, externalUid: row.external_uid, email: row.email, name: row.name };
}
