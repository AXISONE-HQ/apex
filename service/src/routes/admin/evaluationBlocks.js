import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import {
  BLOCK_CATEGORY_IDS,
  createEvaluationBlockForOrg,
  getEvaluationBlockForOrg,
  listEvaluationBlocksForOrg,
  listPopularEvaluationBlocksForOrg,
  updateEvaluationBlockForOrg,
} from "../../services/evaluationBlocksService.js";

const router = Router({ mergeParams: true });

const CREATE_FIELDS = new Set([
  "name",
  "sport",
  "evaluation_type",
  "scoring_method",
  "scoring_config",
  "instructions",
  "objective",
  "difficulty",
  "team_id",
  "categories",
]);

const PATCH_FIELDS = CREATE_FIELDS;
const SCORING_METHODS = new Set(["numeric_scale", "rating_scale", "custom_metric"]);
const DIFFICULTY_VALUES = new Set(["easy", "medium", "hard"]);
const CREATOR_FILTERS = new Set(["platform", "club", "coach", "ai"]);
const CATEGORY_SET = new Set(BLOCK_CATEGORY_IDS);

const ORG_LEVEL_ROLES = new Set(["OrgAdmin", "ClubDirector", "ManagerCoach"]);

function normalizeOrgId(orgId) {
  return String(orgId);
}

function allowEvaluationBlocksAccess(req, orgId) {
  if (req.user?.isPlatformAdmin === true) return true;
  const normalizedOrgId = normalizeOrgId(orgId);
  const orgScopes = (req.user?.orgScopes || []).map(String);
  if (!orgScopes.includes(normalizedOrgId)) {
    return false;
  }

  const roles = req.user?.roles || [];
  if (roles.some((role) => ORG_LEVEL_ROLES.has(role))) {
    return true;
  }

  if (roles.includes("Coach")) {
    return true;
  }
  return false;
}

function badRequest(res, message) {
  return res.status(400).json({ error: "bad_request", message });
}

function rejectUnknownFields(obj, allowedSet) {
  if (!obj || typeof obj !== "object") return null;
  for (const key of Object.keys(obj)) {
    if (!allowedSet.has(key)) return key;
  }
  return null;
}

function isUuid(value) {
  if (typeof value !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function sanitizeString(value, { field, required = false, max = 255 }) {
  if (value === undefined) {
    if (required) throw new Error(`${field}_required`);
    return undefined;
  }
  if (value === null) {
    if (required) throw new Error(`${field}_required`);
    return null;
  }
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new Error(`${field}_required`);
    return null;
  }
  if (max && trimmed.length > max) throw new Error(`${field}_too_long`);
  return trimmed;
}

function normalizeSport(value) {
  const sport = sanitizeString(value, { field: "sport", required: true, max: 64 });
  return sport.toLowerCase();
}

function normalizeEvaluationType(value) {
  return sanitizeString(value, { field: "evaluation_type", required: true, max: 64 });
}

function normalizeDifficulty(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!DIFFICULTY_VALUES.has(normalized)) {
    throw new Error("invalid_difficulty");
  }
  return normalized;
}

function normalizeInstructions(value) {
  return sanitizeString(value, { field: "instructions", required: true, max: 4000 });
}

function normalizeObjective(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeString(value, { field: "objective", required: false, max: 1000 });
}

function normalizeCategoriesPayload(value) {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("invalid_categories");
  }
  const normalized = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error("invalid_categories");
    }
    const slug = entry.trim().toLowerCase();
    if (!slug) {
      throw new Error("invalid_categories");
    }
    if (!CATEGORY_SET.has(slug)) {
      throw new Error("invalid_categories");
    }
    if (!normalized.includes(slug)) {
      normalized.push(slug);
    }
  }
  return normalized;
}

function normalizeCategoryFilter(value) {
  if (value === undefined || value === null) return undefined;
  const slug = String(value).trim().toLowerCase();
  if (!slug) {
    throw new Error("invalid_category_filter");
  }
  if (!CATEGORY_SET.has(slug)) {
    throw new Error("invalid_category_filter");
  }
  return slug;
}

function normalizeCreatorFilter(value) {
  if (value === undefined || value === null) return undefined;
  const slug = String(value).trim().toLowerCase();
  if (!slug || !CREATOR_FILTERS.has(slug)) {
    throw new Error("invalid_creator_filter");
  }
  return slug;
}

function normalizeLimit(value, { min = 1, max = 50, fallback = 20 } = {}) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("invalid_limit");
  }
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function normalizeSearchQuery(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error("invalid_search_query");
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 140) {
    throw new Error("search_query_too_long");
  }
  return trimmed;
}

function normalizeScoringMethod(value) {
  const method = sanitizeString(value, { field: "scoring_method", required: true, max: 64 }).toLowerCase();
  if (!SCORING_METHODS.has(method)) {
    throw new Error("invalid_scoring_method");
  }
  return method;
}

function normalizeName(value) {
  return sanitizeString(value, { field: "name", required: true, max: 140 });
}

function normalizeScoringConfig(method, rawConfig) {
  if (rawConfig === undefined || rawConfig === null) {
    throw new Error("scoring_config_required");
  }
  if (typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    throw new Error("invalid_scoring_config");
  }

  if (method === "numeric_scale") {
    const min = Number(rawConfig.min);
    const max = Number(rawConfig.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error("invalid_scoring_config_numeric");
    }
    if (min >= max) {
      throw new Error("invalid_scoring_config_numeric");
    }
    return { ...rawConfig, min, max };
  }

  if (method === "rating_scale") {
    const options = rawConfig.options;
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error("invalid_scoring_config_rating");
    }
    const normalized = options.map((opt) => {
      const label = sanitizeString(opt, { field: "rating_option", required: true, max: 64 });
      return label;
    });
    return { ...rawConfig, options: normalized };
  }

  if (method === "custom_metric") {
    const valueLabel = rawConfig.value_label
      ? sanitizeString(rawConfig.value_label, { field: "value_label", required: true, max: 64 })
      : "value";
    const unit = sanitizeString(rawConfig.unit, { field: "unit", required: true, max: 32 });
    return { ...rawConfig, unit, value_label: valueLabel };
  }

  throw new Error("invalid_scoring_method");
}

function sanitizeTeamId(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("invalid_team_id");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("invalid_team_id");
  }
  return trimmed;
}

function deriveCreatorType(req) {
  const roles = req.user?.roles || [];
  const hasOrgRole = roles.some((role) => ORG_LEVEL_ROLES.has(role));
  const isCoach = roles.includes("Coach");
  if (isCoach && !hasOrgRole && req.user?.isPlatformAdmin !== true) {
    return "coach";
  }
  return "club";
}

router.get("/:orgId/evaluation-blocks", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationBlocksAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const filters = {};
  try {
    if (req.query?.sport !== undefined) {
      filters.sport = normalizeSport(req.query.sport);
    }
    if (req.query?.difficulty !== undefined) {
      filters.difficulty = normalizeDifficulty(req.query.difficulty);
    }
    if (req.query?.category !== undefined) {
      filters.category = normalizeCategoryFilter(req.query.category);
    }
    if (req.query?.creator !== undefined) {
      filters.creator = normalizeCreatorFilter(req.query.creator);
    }
    if (req.query?.team_id !== undefined) {
      filters.teamId = sanitizeTeamId(req.query.team_id);
    }
    const search = normalizeSearchQuery(req.query?.search);
    if (search) {
      filters.search = search;
    }
  } catch (err) {
    return badRequest(res, err.message || "invalid_filter");
  }

  try {
    const items = await listEvaluationBlocksForOrg({ orgId, filters });
    return res.status(200).json({ items });
  } catch (err) {
    console.error("[evaluation-blocks.list] failed", err);
    return res.status(500).json({ error: "list_evaluation_blocks_failed" });
  }
});

router.get("/:orgId/evaluation-blocks/popular", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationBlocksAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const filters = {};
  let limit = 20;
  try {
    if (req.query?.sport !== undefined) {
      filters.sport = normalizeSport(req.query.sport);
    }
    limit = normalizeLimit(req.query?.limit, { min: 1, max: 50, fallback: 20 });
  } catch (err) {
    return badRequest(res, err.message || "invalid_filter");
  }

  try {
    const items = await listPopularEvaluationBlocksForOrg({ orgId, filters: { ...filters, limit } });
    return res.status(200).json({ items });
  } catch (err) {
    console.error("[evaluation-blocks.popular] failed", err);
    return res.status(500).json({ error: "list_popular_evaluation_blocks_failed" });
  }
});

router.post("/:orgId/evaluation-blocks", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationBlocksAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, CREATE_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  let name;
  let sport;
  let evaluationType;
  let scoringMethod;
  let scoringConfig;
  let instructions;
  let objective;
  let difficulty;
  let teamId;
  let categories;

  try {
    name = normalizeName(body.name);
    sport = normalizeSport(body.sport);
    evaluationType = normalizeEvaluationType(body.evaluation_type);
    instructions = normalizeInstructions(body.instructions);
    objective = normalizeObjective(body.objective);
    difficulty = normalizeDifficulty(body.difficulty);
    scoringMethod = normalizeScoringMethod(body.scoring_method);
    scoringConfig = normalizeScoringConfig(scoringMethod, body.scoring_config);
    teamId = sanitizeTeamId(body.team_id);
    categories = normalizeCategoriesPayload(body.categories);
  } catch (err) {
    return badRequest(res, err.message || "invalid_payload");
  }

  const createdByType = deriveCreatorType(req);
  try {
    const item = await createEvaluationBlockForOrg({
      orgId,
      teamId,
      name,
      sport,
      evaluationType,
      scoringMethod,
      scoringConfig,
      instructions,
      objective,
      difficulty,
      categories: categories ?? [],
      createdByType,
      createdById: req.user?.id ?? null,
    });
    return res.status(201).json({ item });
  } catch (err) {
    if (err?.code === "team_not_found") {
      return res.status(400).json({ error: "team_not_found" });
    }
    if (err?.code === "invalid_category") {
      return res.status(400).json({ error: "invalid_category" });
    }
    console.error("[evaluation-blocks.create] failed", err);
    return res.status(500).json({ error: "create_evaluation_block_failed" });
  }
});

router.get("/:orgId/evaluation-blocks/:blockId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const blockId = req.params.blockId;
  if (!allowEvaluationBlocksAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  if (!isUuid(blockId)) {
    return badRequest(res, "invalid_block_id");
  }

  const item = await getEvaluationBlockForOrg({ orgId, blockId });
  if (!item) {
    return res.status(404).json({ error: "evaluation_block_not_found" });
  }
  return res.status(200).json({ item });
});

router.patch("/:orgId/evaluation-blocks/:blockId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const blockId = req.params.blockId;
  if (!allowEvaluationBlocksAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  if (!isUuid(blockId)) {
    return badRequest(res, "invalid_block_id");
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, PATCH_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  if (!Object.keys(body).length) {
    return badRequest(res, "empty_patch");
  }

  const existing = await getEvaluationBlockForOrg({ orgId, blockId });
  if (!existing) {
    return res.status(404).json({ error: "evaluation_block_not_found" });
  }
  if (!existing.org_id || String(existing.org_id) !== String(orgId)) {
    // Platform blocks are read-only in org routes.
    return res.status(404).json({ error: "evaluation_block_not_found" });
  }

  const patch = {};

  try {
    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      patch.name = normalizeName(body.name);
    }
    if (Object.prototype.hasOwnProperty.call(body, "sport")) {
      patch.sport = normalizeSport(body.sport);
    }
    if (Object.prototype.hasOwnProperty.call(body, "evaluation_type")) {
      patch.evaluationType = normalizeEvaluationType(body.evaluation_type);
    }
    if (Object.prototype.hasOwnProperty.call(body, "instructions")) {
      patch.instructions = normalizeInstructions(body.instructions);
    }
    if (Object.prototype.hasOwnProperty.call(body, "objective")) {
      patch.objective = normalizeObjective(body.objective);
    }
    if (Object.prototype.hasOwnProperty.call(body, "difficulty")) {
      patch.difficulty = normalizeDifficulty(body.difficulty);
    }
    if (Object.prototype.hasOwnProperty.call(body, "team_id")) {
      patch.teamId = sanitizeTeamId(body.team_id);
    }
    if (Object.prototype.hasOwnProperty.call(body, "categories")) {
      patch.categories = normalizeCategoriesPayload(body.categories) ?? [];
    }
    if (Object.prototype.hasOwnProperty.call(body, "scoring_method")) {
      patch.scoringMethod = normalizeScoringMethod(body.scoring_method);
      if (!Object.prototype.hasOwnProperty.call(body, "scoring_config")) {
        throw new Error("scoring_config_required_with_method");
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, "scoring_config")) {
      const method = patch.scoringMethod || existing.scoring_method;
      if (!method) {
        throw new Error("scoring_method_required");
      }
      patch.scoringConfig = normalizeScoringConfig(method, body.scoring_config);
    }
  } catch (err) {
    return badRequest(res, err.message || "invalid_patch");
  }

  if (!Object.keys(patch).length) {
    return badRequest(res, "no_fields_to_update");
  }

  try {
    const updated = await updateEvaluationBlockForOrg({ orgId, blockId, patch });
    if (!updated) {
      return res.status(404).json({ error: "evaluation_block_not_found" });
    }
    return res.status(200).json({ item: updated });
  } catch (err) {
    if (err?.code === "team_not_found") {
      return res.status(400).json({ error: "team_not_found" });
    }
    if (err?.code === "invalid_category") {
      return res.status(400).json({ error: "invalid_category" });
    }
    console.error("[evaluation-blocks.patch] failed", err);
    return res.status(500).json({ error: "update_evaluation_block_failed" });
  }
});

export default router;
