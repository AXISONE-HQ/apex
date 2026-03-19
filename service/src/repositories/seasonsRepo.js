import { hasDatabase, query } from "../db/client.js";

const ALLOWED_STATUSES = new Set(["draft", "active", "completed", "archived"]);
const UPDATABLE_FIELDS = new Set(["label", "year", "starts_on", "ends_on", "status"]);

const memorySeasons = new Map();
let memorySeq = 1;

function makeMemoryId() {
  return `season_${memorySeq++}`;
}

function canTransition(from, to) {
  if (from === to) return true;
  if (!ALLOWED_STATUSES.has(to)) return false;
  switch (from) {
    case "draft":
      return to === "active" || to === "archived";
    case "active":
      return to === "completed" || to === "archived";
    case "completed":
      return to === "archived";
    case "archived":
    default:
      return false;
  }
}

function normalizeStatus(status) {
  if (!status) return "draft";
  const value = String(status).toLowerCase();
  if (!ALLOWED_STATUSES.has(value)) {
    throw new Error("invalid_status");
  }
  return value;
}

export async function createSeason({
  orgId,
  label,
  year = null,
  starts_on = null,
  ends_on = null,
  status = "draft",
} = {}) {
  if (!orgId) throw new Error("orgId required");
  if (!label) throw new Error("label required");
  const normalizedStatus = normalizeStatus(status);
  const normalizedYear = year === undefined ? null : year;
  const normalizedStart = starts_on === undefined ? null : starts_on;
  const normalizedEnd = ends_on === undefined ? null : ends_on;

  if (!hasDatabase()) {
    for (const existing of memorySeasons.values()) {
      if (String(existing.org_id) === String(orgId) && existing.label === label) {
        const err = new Error("duplicate_season");
        err.code = "23505";
        throw err;
      }
    }
    const id = makeMemoryId();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      label,
      year: normalizedYear,
      status: normalizedStatus,
      starts_on: normalizedStart,
      ends_on: normalizedEnd,
      created_at: now,
      updated_at: now,
    };
    memorySeasons.set(id, row);
    return row;
  }

  const result = await query(
    `INSERT INTO seasons (org_id, label, year, status, starts_on, ends_on)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [orgId, label, normalizedYear, normalizedStatus, normalizedStart, normalizedEnd]
  );

  return await getSeasonById(orgId, result.rows[0].id);
}

export async function listSeasons(orgId, { status = null } = {}) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    let rows = Array.from(memorySeasons.values()).filter((row) => String(row.org_id) === String(orgId));
    if (status) {
      const nextStatus = normalizeStatus(status);
      rows = rows.filter((row) => row.status === nextStatus);
    }
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const params = [orgId];
  let where = "org_id = $1";
  if (status) {
    params.push(normalizeStatus(status));
    where += ` AND status = $${params.length}`;
  }

  const result = await query(
    `SELECT id, org_id, label, year, status, starts_on, ends_on, created_at, updated_at
     FROM seasons
     WHERE ${where}
     ORDER BY created_at DESC`,
    params
  );

  return result.rows;
}

export async function getSeasonById(orgId, seasonId) {
  if (!orgId) throw new Error("orgId required");
  if (!seasonId) return null;

  if (!hasDatabase()) {
    const row = memorySeasons.get(seasonId) || null;
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return row;
  }

  const result = await query(
    `SELECT id, org_id, label, year, status, starts_on, ends_on, created_at, updated_at
     FROM seasons
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [orgId, seasonId]
  );

  return result.rows[0] || null;
}

export async function updateSeason(orgId, seasonId, patch = {}) {
  if (!orgId) throw new Error("orgId required");
  if (!seasonId) return null;

  const entries = Object.entries(patch || {}).filter(([key]) => UPDATABLE_FIELDS.has(key));
  if (!entries.length) {
    throw new Error("no_updatable_fields");
  }

  const nextStatus = entries.find(([key]) => key === "status")?.[1];
  if (nextStatus !== undefined && nextStatus !== null) {
    const existing = await getSeasonById(orgId, seasonId);
    if (!existing) return null;
    const normalized = normalizeStatus(nextStatus);
    if (!canTransition(existing.status, normalized)) {
      const err = new Error("invalid_status_transition");
      err.code = "INVALID_STATUS";
      throw err;
    }
  }

  if (!hasDatabase()) {
    const existing = memorySeasons.get(seasonId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;
    const updated = {
      ...existing,
      ...Object.fromEntries(entries),
      org_id: existing.org_id,
      updated_at: new Date().toISOString(),
    };
    if (nextStatus !== undefined && nextStatus !== null) {
      updated.status = normalizeStatus(nextStatus);
    }
    memorySeasons.set(seasonId, updated);
    return updated;
  }

  const set = [];
  const values = [orgId, seasonId];
  let idx = 3;

  for (const [key, rawValue] of entries) {
    if (key === "status") {
      // already validated via getSeasonById above
      const normalized = normalizeStatus(rawValue);
      set.push(`status = $${idx}`);
      values.push(normalized);
      idx += 1;
      continue;
    }
    const normalized = rawValue === undefined ? null : rawValue;
    set.push(`${key} = $${idx}`);
    values.push(normalized);
    idx += 1;
  }
  set.push("updated_at = NOW()");

  const result = await query(
    `UPDATE seasons
     SET ${set.join(", ")}
     WHERE org_id = $1 AND id = $2
     RETURNING id`,
    values
  );

  if (!result.rows[0]) return null;
  return await getSeasonById(orgId, seasonId);
}
