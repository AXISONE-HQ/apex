import { hasDatabase, query } from "../db/client.js";

const demoAnnouncements = [];

export async function listAnnouncements({ orgId, limit = 50 } = {}) {
  if (!orgId) return [];

  if (!hasDatabase()) {
    return demoAnnouncements
      .filter((a) => a.orgId === orgId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  const result = await query(
    `SELECT id, org_id, title, body, created_by, created_at
     FROM announcements
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [orgId, limit]
  );

  return result.rows;
}

export async function createAnnouncement({ orgId, title, body, createdBy = null } = {}) {
  if (!orgId || !title || !body) {
    throw new Error("orgId, title, and body are required");
  }

  if (!hasDatabase()) {
    const a = {
      id: `announcement_${demoAnnouncements.length + 1}`,
      orgId,
      title,
      body,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    demoAnnouncements.unshift(a);
    return a;
  }

  const result = await query(
    `INSERT INTO announcements (org_id, title, body, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING id, org_id, title, body, created_by, created_at`,
    [orgId, title, body, createdBy]
  );

  return result.rows[0];
}
