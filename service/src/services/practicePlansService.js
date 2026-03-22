import {
  createPracticePlan,
  deletePracticePlan,
  getPracticePlanById,
  listPracticePlans,
  publishPracticePlan,
  unpublishPracticePlan,
  updatePracticePlan,
  listPracticePlanBlocks,
  getPracticePlanBlockById,
  createPracticePlanBlock,
  updatePracticePlanBlock,
  deletePracticePlanBlock,
  reorderPracticePlanBlocks,
} from "../repositories/practicePlansRepo.js";

const VALID_STATUSES = new Set(["draft", "published"]);

function validationError(message, details = undefined) {
  const err = new Error(message);
  err.code = "validation_error";
  if (details !== undefined) err.details = details;
  return err;
}

function notFoundError(message = "practice_plan_not_found") {
  const err = new Error(message);
  err.code = "not_found";
  return err;
}

function normalizeString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function normalizeFocusAreas(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, 50);
}

function normalizeDurationMinutes(value, field = "durationMinutes") {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw validationError(`${field} must be a number between 1 and 600`);
  }
  const rounded = Math.trunc(num);
  if (rounded < 1 || rounded > 600) {
    throw validationError(`${field} must be between 1 and 600`);
  }
  return rounded;
}

function normalizeStartOffset(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw validationError("startOffsetMinutes must be between 0 and 1440");
  }
  const rounded = Math.trunc(num);
  if (rounded < 0 || rounded > 1440) {
    throw validationError("startOffsetMinutes must be between 0 and 1440");
  }
  return rounded;
}

function normalizeStatus(value) {
  if (!value) return null;
  const status = String(value).trim();
  if (!VALID_STATUSES.has(status)) {
    throw validationError("status must be draft or published");
  }
  return status;
}

async function ensurePlanForOrg({ orgId, planId }) {
  const plan = await getPracticePlanById({ orgId, planId });
  if (!plan) throw notFoundError();
  return plan;
}

export async function listPracticePlansForOrg({ orgId, filters = {}, limit = 20, offset = 0 }) {
  if (!orgId) throw validationError("orgId required");

  const sanitizedFilters = {
    teamId: normalizeString(filters.teamId) || undefined,
    status: filters.status ? normalizeStatus(filters.status) : undefined,
    coachUserId: normalizeString(filters.coachUserId) || undefined,
    fromDate: normalizeString(filters.fromDate) || undefined,
    toDate: normalizeString(filters.toDate) || undefined,
    search: normalizeString(filters.search) || undefined,
  };

  return await listPracticePlans({ orgId, filters: sanitizedFilters, limit, offset });
}

export async function getPracticePlanForOrg({ orgId, planId }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  return await getPracticePlanById({ orgId, planId });
}

export async function createPracticePlanForOrg({ orgId, userId = null, payload = {} }) {
  if (!orgId) throw validationError("orgId required");
  const title = normalizeString(payload.title);
  if (!title) throw validationError("title is required");

  const status = payload.status ? normalizeStatus(payload.status) : "draft";
  const focusAreas = normalizeFocusAreas(payload.focusAreas || []);
  const durationMinutes = normalizeDurationMinutes(payload.durationMinutes, "durationMinutes");

  return await createPracticePlan({
    orgId,
    teamId: normalizeString(payload.teamId),
    coachUserId: normalizeString(payload.coachUserId) || userId,
    title,
    practiceDate: normalizeString(payload.practiceDate),
    durationMinutes,
    focusAreas,
    notes: payload.notes ?? null,
    status,
  });
}

export async function updatePracticePlanForOrg({ orgId, planId, payload = {} }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");

  const updates = {};
  if (payload.title !== undefined) updates.title = normalizeString(payload.title);
  if (payload.teamId !== undefined) updates.teamId = normalizeString(payload.teamId);
  if (payload.coachUserId !== undefined) updates.coachUserId = normalizeString(payload.coachUserId);
  if (payload.practiceDate !== undefined) updates.practiceDate = normalizeString(payload.practiceDate);
  if (payload.durationMinutes !== undefined) {
    updates.durationMinutes = normalizeDurationMinutes(payload.durationMinutes, "durationMinutes");
  }
  if (payload.focusAreas !== undefined) updates.focusAreas = normalizeFocusAreas(payload.focusAreas);
  if (payload.notes !== undefined) updates.notes = payload.notes ?? null;
  if (payload.status !== undefined) updates.status = normalizeStatus(payload.status);

  if (!Object.keys(updates).length) {
    throw validationError("no fields provided to update");
  }

  const updated = await updatePracticePlan({
    orgId,
    planId,
    title: updates.title,
    teamId: updates.teamId,
    coachUserId: updates.coachUserId,
    practiceDate: updates.practiceDate,
    durationMinutes: updates.durationMinutes,
    focusAreas: updates.focusAreas,
    notes: updates.notes,
    status: updates.status,
  });

  if (!updated) throw notFoundError();
  return updated;
}

export async function setPracticePlanStatusForOrg({ orgId, planId, status }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  const normalizedStatus = normalizeStatus(status);
  const updated = await (normalizedStatus === "published"
    ? publishPracticePlan({ orgId, planId })
    : unpublishPracticePlan({ orgId, planId }));
  if (!updated) throw notFoundError();
  return updated;
}

export async function deletePracticePlanForOrg({ orgId, planId }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  const deleted = await deletePracticePlan({ orgId, planId });
  if (!deleted) throw notFoundError();
  return true;
}

export async function listPracticePlanBlocksForOrg({ orgId, planId }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  await ensurePlanForOrg({ orgId, planId });
  return await listPracticePlanBlocks({ planId });
}

function normalizeBlockPayload(payload = {}, { allowEmpty = false } = {}) {
  const updates = {};
  if (payload.name !== undefined) {
    const name = normalizeString(payload.name);
    if (!name && !allowEmpty) {
      throw validationError("block name is required");
    }
    updates.name = name;
  }
  if (payload.drillId !== undefined) updates.drillId = normalizeString(payload.drillId);
  if (payload.description !== undefined) updates.description = payload.description ?? null;
  if (payload.focusAreas !== undefined) updates.focusAreas = normalizeFocusAreas(payload.focusAreas);
  if (payload.durationMinutes !== undefined) {
    updates.durationMinutes = normalizeDurationMinutes(payload.durationMinutes, "block.durationMinutes");
  }
  if (payload.startOffsetMinutes !== undefined) {
    updates.startOffsetMinutes = normalizeStartOffset(payload.startOffsetMinutes);
  }
  if (payload.playerGrouping !== undefined) {
    updates.playerGrouping = normalizeString(payload.playerGrouping);
  }
  if (payload.position !== undefined) {
    const posNum = Number(payload.position);
    if (!Number.isFinite(posNum) || posNum < 1) {
      throw validationError("block position must be >= 1");
    }
    updates.position = Math.trunc(posNum);
  }
  return updates;
}

export async function addPracticePlanBlockForOrg({ orgId, planId, payload = {} }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  await ensurePlanForOrg({ orgId, planId });

  const blockPayload = normalizeBlockPayload(payload);
  if (!blockPayload.name) throw validationError("block name is required");

  return await createPracticePlanBlock({
    planId,
    drillId: blockPayload.drillId,
    name: blockPayload.name,
    description: blockPayload.description,
    focusAreas: blockPayload.focusAreas,
    durationMinutes: blockPayload.durationMinutes,
    startOffsetMinutes: blockPayload.startOffsetMinutes,
    playerGrouping: blockPayload.playerGrouping,
    position: blockPayload.position,
  });
}

export async function updatePracticePlanBlockForOrg({ orgId, planId, blockId, payload = {} }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  if (!blockId) throw validationError("blockId required");
  await ensurePlanForOrg({ orgId, planId });

  const updates = normalizeBlockPayload(payload, { allowEmpty: true });
  if (!Object.keys(updates).length) {
    throw validationError("no block fields provided to update");
  }

  const updated = await updatePracticePlanBlock({
    planId,
    planBlockId: blockId,
    drillId: updates.drillId,
    name: updates.name,
    description: updates.description,
    focusAreas: updates.focusAreas,
    durationMinutes: updates.durationMinutes,
    startOffsetMinutes: updates.startOffsetMinutes,
    playerGrouping: updates.playerGrouping,
    position: updates.position,
  });

  if (!updated) throw notFoundError("practice_plan_block_not_found");
  return updated;
}

export async function deletePracticePlanBlockForOrg({ orgId, planId, blockId }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  if (!blockId) throw validationError("blockId required");
  await ensurePlanForOrg({ orgId, planId });
  const deleted = await deletePracticePlanBlock({ planId, planBlockId: blockId });
  if (!deleted) throw notFoundError("practice_plan_block_not_found");
  return true;
}

export async function reorderPracticePlanBlocksForOrg({ orgId, planId, orderedIds }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    throw validationError("orderedIds must be a non-empty array");
  }
  await ensurePlanForOrg({ orgId, planId });
  try {
    return await reorderPracticePlanBlocks({ planId, orderedIds });
  } catch (err) {
    if (err.code === "invalid_reorder" || err.message === "invalid_reorder") {
      throw validationError("orderedIds must include each existing block exactly once");
    }
    throw err;
  }
}

export async function getPracticePlanBlockForOrg({ orgId, planId, blockId }) {
  if (!orgId) throw validationError("orgId required");
  if (!planId) throw validationError("planId required");
  if (!blockId) throw validationError("blockId required");
  await ensurePlanForOrg({ orgId, planId });
  const block = await getPracticePlanBlockById({ planId, planBlockId: blockId });
  if (!block) throw notFoundError("practice_plan_block_not_found");
  return block;
}
