import crypto from "node:crypto";
import { hasDatabase, query } from "../db/client.js";

const PRACTICE_PLAN_STATUSES = new Set(["draft", "published"]);
const memoryPlans = new Map();
const memoryPlanBlocks = new Map();

function normalizeFocusAreas(focusAreas) {
  if (!Array.isArray(focusAreas)) return [];
  return focusAreas
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function mapPlanRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.org_id,
    team_id: row.team_id,
    coach_user_id: row.coach_user_id,
    title: row.title,
    practice_date: row.practice_date,
    duration_minutes: row.duration_minutes,
    focus_areas: Array.isArray(row.focus_areas) ? row.focus_areas : [],
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPlanBlockRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    plan_id: row.plan_id,
    drill_id: row.drill_id,
    name: row.name,
    description: row.description,
    focus_areas: Array.isArray(row.focus_areas) ? row.focus_areas : [],
    duration_minutes: row.duration_minutes,
    start_offset_minutes: row.start_offset_minutes,
    player_grouping: row.player_grouping,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function makeMemoryPlan(row) {
  return mapPlanRow({
    ...row,
    focus_areas: Array.isArray(row.focus_areas) ? [...row.focus_areas] : [],
  });
}

function makeMemoryPlanBlock(row) {
  return mapPlanBlockRow({
    ...row,
    focus_areas: Array.isArray(row.focus_areas) ? [...row.focus_areas] : [],
  });
}

function ensureValidStatus(status) {
  if (!PRACTICE_PLAN_STATUSES.has(status)) {
    const err = new Error("invalid_status");
    err.code = "invalid_status";
    throw err;
  }
  return status;
}

async function getNextPositionForPlan(planId) {
  if (!hasDatabase()) {
    let maxPos = 0;
    memoryPlanBlocks.forEach((row) => {
      if (row.plan_id === planId && typeof row.position === "number") {
        maxPos = Math.max(maxPos, row.position);
      }
    });
    return maxPos + 1;
  }

  const result = await query(
    `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
     FROM practice_plan_blocks
     WHERE plan_id = $1`,
    [planId]
  );
  return result.rows[0]?.next_position || 1;
}

export async function createPracticePlan({
  orgId,
  teamId = null,
  coachUserId = null,
  title,
  practiceDate = null,
  durationMinutes = null,
  focusAreas = [],
  notes = null,
  status = "draft",
}) {
  if (!orgId) throw new Error("orgId required");
  if (!title || typeof title !== "string") throw new Error("title required");
  ensureValidStatus(status || "draft");

  const normalizedFocusAreas = normalizeFocusAreas(focusAreas);

  if (!hasDatabase()) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      team_id: teamId ? String(teamId) : null,
      coach_user_id: coachUserId ? String(coachUserId) : null,
      title: title.trim(),
      practice_date: practiceDate,
      duration_minutes: durationMinutes,
      focus_areas: normalizedFocusAreas,
      notes,
      status: status || "draft",
      created_at: now,
      updated_at: now,
    };
    memoryPlans.set(id, row);
    return makeMemoryPlan(row);
  }

  const result = await query(
    `INSERT INTO practice_plans (
       org_id,
       team_id,
       coach_user_id,
       title,
       practice_date,
       duration_minutes,
       focus_areas,
       notes,
       status
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, org_id, team_id, coach_user_id, title, practice_date, duration_minutes,
       focus_areas, notes, status, created_at, updated_at`,
    [
      orgId,
      teamId,
      coachUserId,
      title.trim(),
      practiceDate,
      durationMinutes,
      normalizedFocusAreas,
      notes,
      status || "draft",
    ]
  );

  return mapPlanRow(result.rows[0]);
}

export async function listPracticePlans({
  orgId,
  filters = {},
  limit = 100,
  offset = 0,
} = {}) {
  if (!orgId) throw new Error("orgId required");
  const {
    teamId = null,
    status = null,
    coachUserId = null,
    fromDate = null,
    toDate = null,
    search = null,
  } = filters || {};

  if (!hasDatabase()) {
    const rows = Array.from(memoryPlans.values()).filter((row) => String(row.org_id) === String(orgId));
    return rows
      .filter((row) => {
        if (teamId !== null && teamId !== undefined && String(row.team_id || "") !== String(teamId)) return false;
        if (status && row.status !== status) return false;
        if (coachUserId && String(row.coach_user_id || "") !== String(coachUserId)) return false;
        if (fromDate && row.practice_date && row.practice_date < fromDate) return false;
        if (toDate && row.practice_date && row.practice_date > toDate) return false;
        if (search) {
          const haystack = `${row.title || ""} ${row.notes || ""}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
      .map((row) => makeMemoryPlan(row));
  }

  const conditions = ["org_id = $1"];
  const params = [orgId];
  let idx = 2;

  if (teamId !== null && teamId !== undefined) {
    conditions.push(`team_id = $${idx}`);
    params.push(teamId);
    idx += 1;
  }
  if (status) {
    ensureValidStatus(status);
    conditions.push(`status = $${idx}`);
    params.push(status);
    idx += 1;
  }
  if (coachUserId) {
    conditions.push(`coach_user_id = $${idx}`);
    params.push(coachUserId);
    idx += 1;
  }
  if (fromDate) {
    conditions.push(`practice_date >= $${idx}`);
    params.push(fromDate);
    idx += 1;
  }
  if (toDate) {
    conditions.push(`practice_date <= $${idx}`);
    params.push(toDate);
    idx += 1;
  }
  if (search) {
    conditions.push(`(title ILIKE $${idx} OR notes ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx += 1;
  }

  params.push(limit);
  params.push(offset);

  const result = await query(
    `SELECT
       id,
       org_id,
       team_id,
       coach_user_id,
       title,
       practice_date,
       duration_minutes,
       focus_areas,
       notes,
       status,
       created_at,
       updated_at
     FROM practice_plans
     WHERE ${conditions.join(" AND ")}
     ORDER BY practice_date DESC NULLS LAST, updated_at DESC
     LIMIT $${idx}
     OFFSET $${idx + 1}`,
    params
  );

  return result.rows.map(mapPlanRow);
}

export async function getPracticePlanById({ orgId, planId }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) return null;

  if (!hasDatabase()) {
    const row = memoryPlans.get(planId) || null;
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return makeMemoryPlan(row);
  }

  const result = await query(
    `SELECT
       id, org_id, team_id, coach_user_id, title, practice_date, duration_minutes,
       focus_areas, notes, status, created_at, updated_at
     FROM practice_plans
     WHERE id = $1 AND org_id = $2
     LIMIT 1`,
    [planId, orgId]
  );

  return mapPlanRow(result.rows[0]);
}

export async function updatePracticePlan({
  orgId,
  planId,
  title,
  teamId,
  coachUserId,
  practiceDate,
  durationMinutes,
  focusAreas,
  notes,
  status,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");

  const updates = {};
  if (title !== undefined) updates.title = title ? title.trim() : null;
  if (teamId !== undefined) updates.team_id = teamId;
  if (coachUserId !== undefined) updates.coach_user_id = coachUserId;
  if (practiceDate !== undefined) updates.practice_date = practiceDate;
  if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes;
  if (focusAreas !== undefined) updates.focus_areas = normalizeFocusAreas(focusAreas);
  if (notes !== undefined) updates.notes = notes;
  if (status !== undefined) {
    ensureValidStatus(status);
    updates.status = status;
  }

  if (!Object.keys(updates).length) {
    return await getPracticePlanById({ orgId, planId });
  }

  if (!hasDatabase()) {
    const existing = memoryPlans.get(planId);
    if (!existing || String(existing.org_id) !== String(orgId)) {
      return null;
    }
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    memoryPlans.set(planId, updated);
    return makeMemoryPlan(updated);
  }

  const setClauses = [];
  const params = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${idx}`);
    params.push(value);
    idx += 1;
  }
  setClauses.push("updated_at = NOW()");

  params.push(planId);
  params.push(orgId);

  const result = await query(
    `UPDATE practice_plans
     SET ${setClauses.join(", ")}
     WHERE id = $${idx} AND org_id = $${idx + 1}
     RETURNING id, org_id, team_id, coach_user_id, title, practice_date, duration_minutes,
       focus_areas, notes, status, created_at, updated_at`,
    params
  );

  return mapPlanRow(result.rows[0]);
}

export async function deletePracticePlan({ orgId, planId }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");

  if (!hasDatabase()) {
    const existing = memoryPlans.get(planId);
    if (!existing || String(existing.org_id) !== String(orgId)) return false;
    memoryPlans.delete(planId);
    for (const [id, block] of memoryPlanBlocks.entries()) {
      if (block.plan_id === planId) {
        memoryPlanBlocks.delete(id);
      }
    }
    return true;
  }

  const result = await query(
    `DELETE FROM practice_plans
     WHERE id = $1 AND org_id = $2
     RETURNING id`,
    [planId, orgId]
  );
  return result.rows.length > 0;
}

export async function setPracticePlanStatus({ orgId, planId, status }) {
  ensureValidStatus(status);
  return await updatePracticePlan({ orgId, planId, status });
}

export async function publishPracticePlan({ orgId, planId }) {
  return await setPracticePlanStatus({ orgId, planId, status: "published" });
}

export async function unpublishPracticePlan({ orgId, planId }) {
  return await setPracticePlanStatus({ orgId, planId, status: "draft" });
}

export async function listPracticePlanBlocks({ planId }) {
  if (!planId) throw new Error("planId required");

  if (!hasDatabase()) {
    return Array.from(memoryPlanBlocks.values())
      .filter((row) => row.plan_id === planId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((row) => makeMemoryPlanBlock(row));
  }

  const result = await query(
    `SELECT
       id, plan_id, drill_id, name, description, focus_areas,
       duration_minutes, start_offset_minutes, player_grouping,
       position, created_at, updated_at
     FROM practice_plan_blocks
     WHERE plan_id = $1
     ORDER BY position ASC, created_at ASC`,
    [planId]
  );

  return result.rows.map(mapPlanBlockRow);
}

export async function getPracticePlanBlockById({ planId, planBlockId }) {
  if (!planId) throw new Error("planId required");
  if (!planBlockId) return null;

  if (!hasDatabase()) {
    const row = memoryPlanBlocks.get(planBlockId) || null;
    if (!row || row.plan_id !== planId) return null;
    return makeMemoryPlanBlock(row);
  }

  const result = await query(
    `SELECT
       id, plan_id, drill_id, name, description, focus_areas,
       duration_minutes, start_offset_minutes, player_grouping,
       position, created_at, updated_at
     FROM practice_plan_blocks
     WHERE plan_id = $1 AND id = $2
     LIMIT 1`,
    [planId, planBlockId]
  );

  return mapPlanBlockRow(result.rows[0]);
}

export async function createPracticePlanBlock({
  planId,
  drillId = null,
  name,
  description = null,
  focusAreas = [],
  durationMinutes = null,
  startOffsetMinutes = null,
  playerGrouping = null,
  position = null,
}) {
  if (!planId) throw new Error("planId required");
  if (!name || typeof name !== "string") throw new Error("name required");

  const normalizedFocusAreas = normalizeFocusAreas(focusAreas);
  const resolvedPosition = position ?? (await getNextPositionForPlan(planId));

  if (!hasDatabase()) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      plan_id: planId,
      drill_id: drillId,
      name: name.trim(),
      description,
      focus_areas: normalizedFocusAreas,
      duration_minutes: durationMinutes,
      start_offset_minutes: startOffsetMinutes,
      player_grouping: playerGrouping,
      position: resolvedPosition,
      created_at: now,
      updated_at: now,
    };
    memoryPlanBlocks.set(id, row);
    return makeMemoryPlanBlock(row);
  }

  const result = await query(
    `INSERT INTO practice_plan_blocks (
       plan_id,
       drill_id,
       name,
       description,
       focus_areas,
       duration_minutes,
       start_offset_minutes,
       player_grouping,
       position
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, plan_id, drill_id, name, description, focus_areas,
       duration_minutes, start_offset_minutes, player_grouping,
       position, created_at, updated_at`,
    [
      planId,
      drillId,
      name.trim(),
      description,
      normalizedFocusAreas,
      durationMinutes,
      startOffsetMinutes,
      playerGrouping,
      resolvedPosition,
    ]
  );

  return mapPlanBlockRow(result.rows[0]);
}

export async function updatePracticePlanBlock({
  planId,
  planBlockId,
  drillId,
  name,
  description,
  focusAreas,
  durationMinutes,
  startOffsetMinutes,
  playerGrouping,
  position,
}) {
  if (!planId) throw new Error("planId required");
  if (!planBlockId) throw new Error("planBlockId required");

  const updates = {};
  if (drillId !== undefined) updates.drill_id = drillId;
  if (name !== undefined) updates.name = name ? name.trim() : null;
  if (description !== undefined) updates.description = description;
  if (focusAreas !== undefined) updates.focus_areas = normalizeFocusAreas(focusAreas);
  if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes;
  if (startOffsetMinutes !== undefined) updates.start_offset_minutes = startOffsetMinutes;
  if (playerGrouping !== undefined) updates.player_grouping = playerGrouping;
  if (position !== undefined) updates.position = position;

  if (!Object.keys(updates).length) {
    return await getPracticePlanBlockById({ planId, planBlockId });
  }

  if (!hasDatabase()) {
    const existing = memoryPlanBlocks.get(planBlockId);
    if (!existing || existing.plan_id !== planId) {
      return null;
    }
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    memoryPlanBlocks.set(planBlockId, updated);
    return makeMemoryPlanBlock(updated);
  }

  const setClauses = [];
  const params = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${idx}`);
    params.push(value);
    idx += 1;
  }
  setClauses.push("updated_at = NOW()");

  params.push(planBlockId);
  params.push(planId);

  const result = await query(
    `UPDATE practice_plan_blocks
     SET ${setClauses.join(", ")}
     WHERE id = $${idx} AND plan_id = $${idx + 1}
     RETURNING id, plan_id, drill_id, name, description, focus_areas,
       duration_minutes, start_offset_minutes, player_grouping,
       position, created_at, updated_at`,
    params
  );

  return mapPlanBlockRow(result.rows[0]);
}

export async function deletePracticePlanBlock({ planId, planBlockId }) {
  if (!planId) throw new Error("planId required");
  if (!planBlockId) throw new Error("planBlockId required");

  if (!hasDatabase()) {
    const existing = memoryPlanBlocks.get(planBlockId);
    if (!existing || existing.plan_id !== planId) return false;
    memoryPlanBlocks.delete(planBlockId);
    return true;
  }

  const result = await query(
    `DELETE FROM practice_plan_blocks
     WHERE id = $1 AND plan_id = $2
     RETURNING id`,
    [planBlockId, planId]
  );
  return result.rows.length > 0;
}

export async function setPracticePlanBlockPositions({ planId, orderedIds = [] }) {
  if (!planId) throw new Error("planId required");

  if (!hasDatabase()) {
    orderedIds.forEach((planBlockId, index) => {
      const row = memoryPlanBlocks.get(planBlockId);
      if (!row || row.plan_id !== planId) return;
      memoryPlanBlocks.set(planBlockId, { ...row, position: index + 1, updated_at: new Date().toISOString() });
    });
    return true;
  }

  if (!orderedIds.length) {
    await query(
      `UPDATE practice_plan_blocks
       SET position = sub.rn
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY position) AS rn
         FROM practice_plan_blocks
         WHERE plan_id = $1
       ) sub
       WHERE practice_plan_blocks.plan_id = $1 AND practice_plan_blocks.id = sub.id`,
      [planId]
    );
    return true;
  }

  await query("BEGIN");
  try {
    await query(
      `UPDATE practice_plan_blocks
       SET position = position + 10000
       WHERE plan_id = $1`,
      [planId]
    );

    await query(
      `WITH ordered AS (
         SELECT value::uuid AS plan_block_id, row_number() OVER () AS rn
         FROM unnest($2::uuid[]) WITH ORDINALITY AS t(value, ord)
         ORDER BY ord
       )
       UPDATE practice_plan_blocks ppb
       SET position = ordered.rn
       FROM ordered
       WHERE ppb.plan_id = $1 AND ppb.id = ordered.plan_block_id`,
      [planId, orderedIds]
    );

    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
  return true;
}

function invalidReorderError() {
  const err = new Error("invalid_reorder");
  err.code = "invalid_reorder";
  return err;
}

export async function reorderPracticePlanBlocks({ planId, orderedIds }) {
  if (!planId) throw new Error("planId required");
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw invalidReorderError();
  }

  const current = await listPracticePlanBlocks({ planId });
  const currentIds = current.map((row) => row.id);
  if (orderedIds.length !== currentIds.length) {
    throw invalidReorderError();
  }

  const seen = new Set();
  for (const id of orderedIds) {
    if (!currentIds.includes(id)) {
      throw invalidReorderError();
    }
    if (seen.has(id)) {
      throw invalidReorderError();
    }
    seen.add(id);
  }

  await setPracticePlanBlockPositions({ planId, orderedIds });
  return await listPracticePlanBlocks({ planId });
}
