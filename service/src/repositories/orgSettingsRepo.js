import { hasDatabase, query } from "../db/client.js";

// In-memory fallback settings (non-DB mode)
const memorySettingsByOrg = new Map();

export async function getOrgSettings(orgId) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    return { org_id: String(orgId), settings: memorySettingsByOrg.get(String(orgId)) || {} };
  }

  const result = await query(
    `SELECT id AS org_id, settings
     FROM organizations
     WHERE id = $1
     LIMIT 1`,
    [orgId]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    org_id: row.org_id,
    settings: row.settings || {},
  };
}

export async function updateOrgSettings(orgId, settings) {
  if (!orgId) throw new Error("orgId required");

  // Normalize nullish settings defensively.
  const normalized = settings && typeof settings === "object" ? settings : {};

  if (!hasDatabase()) {
    memorySettingsByOrg.set(String(orgId), normalized);
    return { org_id: String(orgId), settings: normalized };
  }

  const result = await query(
    `UPDATE organizations
     SET settings = $2::jsonb
     WHERE id = $1
     RETURNING id AS org_id, settings`,
    [orgId, normalized]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    org_id: row.org_id,
    settings: row.settings || {},
  };
}
