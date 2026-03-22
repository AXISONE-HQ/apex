import {
  createPracticeDrill,
  deletePracticeDrill,
  getPracticeDrillById,
  listPracticeDrills,
  updatePracticeDrill,
} from "../repositories/practiceDrillsRepo.js";

function validationError(message, details = undefined) {
  const err = new Error(message);
  err.code = "validation_error";
  if (details !== undefined) {
    err.details = details;
  }
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
    .slice(0, 25);
}

function normalizeDurationMinutes(value, field = "defaultDurationMinutes") {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw validationError(`${field} must be a number between 1 and 600`);
  }
  const rounded = Math.trunc(num);
  if (rounded < 1 || rounded > 600) {
    throw validationError(`${field} must be between 1 and 600 minutes`);
  }
  return rounded;
}

export async function listPracticeDrillsForOrg({ orgId, filters = {}, limit = 20, offset = 0 }) {
  if (!orgId) throw validationError("orgId required");

  const sanitizedFilters = {
    category: normalizeString(filters.category) || undefined,
    focusArea: normalizeString(filters.focusArea) || undefined,
    createdBy: normalizeString(filters.createdBy) || undefined,
    search: normalizeString(filters.search) || undefined,
  };

  return await listPracticeDrills({ orgId, filters: sanitizedFilters, limit, offset });
}

export async function getPracticeDrillForOrg({ orgId, drillId }) {
  if (!orgId) throw validationError("orgId required");
  if (!drillId) throw validationError("drillId required");
  return await getPracticeDrillById({ orgId, drillId });
}

export async function createPracticeDrillForOrg({ orgId, userId = null, payload = {} }) {
  if (!orgId) throw validationError("orgId required");

  const name = normalizeString(payload.name);
  const category = normalizeString(payload.category);
  if (!name) throw validationError("name is required");
  if (!category) throw validationError("category is required");

  const focusAreas = normalizeFocusAreas(payload.focusAreas || payload.focusAreasCsv);
  const defaultDurationMinutes = normalizeDurationMinutes(
    payload.defaultDurationMinutes,
    "defaultDurationMinutes"
  );

  return await createPracticeDrill({
    orgId,
    createdBy: userId,
    name,
    category,
    focusAreas,
    defaultDurationMinutes,
    description: payload.description ?? null,
    instructions: payload.instructions ?? null,
    equipment: payload.equipment ?? null,
  });
}

export async function updatePracticeDrillForOrg({ orgId, drillId, payload = {} }) {
  if (!orgId) throw validationError("orgId required");
  if (!drillId) throw validationError("drillId required");

  const updates = {};
  if (payload.name !== undefined) updates.name = normalizeString(payload.name);
  if (payload.category !== undefined) updates.category = normalizeString(payload.category);
  if (payload.focusAreas !== undefined) updates.focusAreas = normalizeFocusAreas(payload.focusAreas);
  if (payload.defaultDurationMinutes !== undefined) {
    updates.defaultDurationMinutes = normalizeDurationMinutes(
      payload.defaultDurationMinutes,
      "defaultDurationMinutes"
    );
  }
  if (payload.description !== undefined) updates.description = payload.description ?? null;
  if (payload.instructions !== undefined) updates.instructions = payload.instructions ?? null;
  if (payload.equipment !== undefined) updates.equipment = payload.equipment ?? null;

  if (!Object.keys(updates).length) {
    throw validationError("no fields provided to update");
  }

  const updated = await updatePracticeDrill({
    orgId,
    drillId,
    name: updates.name,
    category: updates.category,
    focusAreas: updates.focusAreas,
    defaultDurationMinutes: updates.defaultDurationMinutes,
    description: updates.description,
    instructions: updates.instructions,
    equipment: updates.equipment,
  });

  if (!updated) {
    return null;
  }
  return updated;
}

export async function deletePracticeDrillForOrg({ orgId, drillId }) {
  if (!orgId) throw validationError("orgId required");
  if (!drillId) throw validationError("drillId required");
  return await deletePracticeDrill({ orgId, drillId });
}
