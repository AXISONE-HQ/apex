import crypto from "node:crypto";
import { hasDatabase, query } from "../db/client.js";

const memoryDrills = new Map();

function normalizeFocusAreas(focusAreas) {
  if (!Array.isArray(focusAreas)) return [];
  return focusAreas
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function mapDrillRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    created_by: row.created_by,
    name: row.name,
    category: row.category,
    focus_areas: Array.isArray(row.focus_areas) ? row.focus_areas : [],
    default_duration_minutes: row.default_duration_minutes,
    description: row.description,
    instructions: row.instructions,
    equipment: row.equipment,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function makeMemoryDrill(row) {
  const focusAreas = Array.isArray(row.focus_areas) ? [...row.focus_areas] : [];
  return mapDrillRow({ ...row, focus_areas: focusAreas });
}

export async function createPracticeDrill({
  orgId,
  createdBy = null,
  name,
  category,
  focusAreas = [],
  defaultDurationMinutes = null,
  description = null,
  instructions = null,
  equipment = null,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!name || typeof name !== "string") throw new Error("name required");
  if (!category || typeof category !== "string") throw new Error("category required");

  const normalizedFocusAreas = normalizeFocusAreas(focusAreas);

  if (!hasDatabase()) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      created_by: createdBy ? String(createdBy) : null,
      name: name.trim(),
      category: category.trim(),
      focus_areas: normalizedFocusAreas,
      default_duration_minutes: defaultDurationMinutes,
      description,
      instructions,
      equipment,
      created_at: now,
      updated_at: now,
    };
    memoryDrills.set(id, row);
    return makeMemoryDrill(row);
  }

  const result = await query(
    `INSERT INTO practice_drills (
       org_id,
       created_by,
       name,
       category,
       focus_areas,
       default_duration_minutes,
       description,
       instructions,
       equipment
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, org_id, created_by, name, category, focus_areas, default_duration_minutes,
       description, instructions, equipment, created_at, updated_at`,
    [
      orgId,
      createdBy,
      name.trim(),
      category.trim(),
      normalizedFocusAreas,
      defaultDurationMinutes,
      description,
      instructions,
      equipment,
    ]
  );

  return mapDrillRow(result.rows[0]);
}

export async function listPracticeDrills({ orgId, filters = {}, limit = 100, offset = 0 } = {}) {
  if (!orgId) throw new Error("orgId required");
  const { category = null, focusArea = null, createdBy = null, search = null } = filters || {};

  if (!hasDatabase()) {
    const items = Array.from(memoryDrills.values()).filter((row) => String(row.org_id) === String(orgId));
    return items
      .filter((row) => {
        if (category && row.category !== category) return false;
        if (createdBy && String(row.created_by || "") !== String(createdBy)) return false;
        if (focusArea && !(row.focus_areas || []).includes(focusArea)) return false;
        if (search) {
          const haystack = `${row.name || ""} ${row.description || ""}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(offset, offset + limit)
      .map((row) => makeMemoryDrill(row));
  }

  const conditions = ["org_id = $1"];
  const params = [orgId];
  let idx = 2;

  if (category) {
    conditions.push(`category = $${idx}`);
    params.push(category);
    idx += 1;
  }
  if (createdBy) {
    conditions.push(`created_by = $${idx}`);
    params.push(createdBy);
    idx += 1;
  }
  if (focusArea) {
    conditions.push(`$${idx} = ANY(focus_areas)`);
    params.push(focusArea);
    idx += 1;
  }
  if (search) {
    conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx += 1;
  }

  params.push(limit);
  params.push(offset);

  const result = await query(
    `SELECT
       id,
       org_id,
       created_by,
       name,
       category,
       focus_areas,
       default_duration_minutes,
       description,
       instructions,
       equipment,
       created_at,
       updated_at
     FROM practice_drills
     WHERE ${conditions.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT $${idx}
     OFFSET $${idx + 1}`,
    params
  );

  return result.rows.map(mapDrillRow);
}

export async function getPracticeDrillById({ orgId, drillId }) {
  if (!orgId) throw new Error("orgId required");
  if (!drillId) return null;

  if (!hasDatabase()) {
    const row = memoryDrills.get(drillId) || null;
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return makeMemoryDrill(row);
  }

  const result = await query(
    `SELECT
       id, org_id, created_by, name, category, focus_areas, default_duration_minutes,
       description, instructions, equipment, created_at, updated_at
     FROM practice_drills
     WHERE id = $1 AND org_id = $2
     LIMIT 1`,
    [drillId, orgId]
  );

  return mapDrillRow(result.rows[0]);
}

export async function updatePracticeDrill({
  orgId,
  drillId,
  name,
  category,
  focusAreas,
  defaultDurationMinutes,
  description,
  instructions,
  equipment,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!drillId) throw new Error("drillId required");

  const updates = {};
  if (name !== undefined) updates.name = name ? name.trim() : null;
  if (category !== undefined) updates.category = category ? category.trim() : null;
  if (focusAreas !== undefined) updates.focus_areas = normalizeFocusAreas(focusAreas);
  if (defaultDurationMinutes !== undefined) updates.default_duration_minutes = defaultDurationMinutes;
  if (description !== undefined) updates.description = description;
  if (instructions !== undefined) updates.instructions = instructions;
  if (equipment !== undefined) updates.equipment = equipment;

  if (!Object.keys(updates).length) {
    return await getPracticeDrillById({ orgId, drillId });
  }

  if (!hasDatabase()) {
    const existing = memoryDrills.get(drillId);
    if (!existing || String(existing.org_id) !== String(orgId)) {
      return null;
    }
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    memoryDrills.set(drillId, updated);
    return makeMemoryDrill(updated);
  }

  const setClauses = [];
  const params = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${idx}`);
    params.push(value);
    idx += 1;
  }
  setClauses.push(`updated_at = NOW()`);

  params.push(drillId);
  params.push(orgId);

  const result = await query(
    `UPDATE practice_drills
     SET ${setClauses.join(", ")}
     WHERE id = $${idx} AND org_id = $${idx + 1}
     RETURNING id, org_id, created_by, name, category, focus_areas, default_duration_minutes,
       description, instructions, equipment, created_at, updated_at`,
    params
  );

  return mapDrillRow(result.rows[0]);
}

export async function deletePracticeDrill({ orgId, drillId }) {
  if (!orgId) throw new Error("orgId required");
  if (!drillId) throw new Error("drillId required");

  if (!hasDatabase()) {
    const existing = memoryDrills.get(drillId);
    if (!existing || String(existing.org_id) !== String(orgId)) return false;
    memoryDrills.delete(drillId);
    return true;
  }

  const result = await query(
    `DELETE FROM practice_drills
     WHERE id = $1 AND org_id = $2
     RETURNING id`,
    [drillId, orgId]
  );
  return result.rows.length > 0;
}
