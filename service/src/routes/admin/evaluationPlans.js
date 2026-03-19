import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import {
  createEvaluationPlanForOrg,
  getEvaluationPlanForOrg,
  listEvaluationPlansForOrg,
  updateEvaluationPlanForOrg,
  listEvaluationPlanBlocksForOrg,
  addEvaluationPlanBlockForOrg,
  removeEvaluationPlanBlockForOrg,
  duplicateEvaluationPlanBlockForOrg,
  reorderEvaluationPlanBlocksForOrg,
} from "../../services/evaluationPlansService.js";
import { evaluatePlanStrength } from "../../services/evaluationPlanStrengthService.js";

const router = Router({ mergeParams: true });

const CREATE_FIELDS = new Set([
  "name",
  "sport",
  "age_group",
  "gender",
  "team_id",
  "evaluation_category",
  "scope",
]);

const PATCH_FIELDS = CREATE_FIELDS;
const PLAN_BLOCK_CREATE_FIELDS = new Set(["block_id"]);
const PLAN_BLOCK_REORDER_FIELDS = new Set(["ordered_block_ids"]);
const PLAN_CATEGORIES = new Set(["skill", "physical", "tryout", "season_review"]);
const PLAN_SCOPES = new Set(["club", "team"]);
const ORG_LEVEL_ROLES = new Set(["OrgAdmin", "ClubDirector", "ManagerCoach"]);

function normalizeOrgId(orgId) {
  return String(orgId);
}

function allowEvaluationPlansAccess(req, orgId) {
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

function normalizeName(value) {
  return sanitizeString(value, { field: "name", required: true, max: 140 });
}

function normalizeSport(value) {
  const sport = sanitizeString(value, { field: "sport", required: true, max: 64 });
  return sport.toLowerCase();
}

function normalizeOptionalField(value, { field, max = 140 }) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeString(value, { field, required: false, max });
}

function normalizeEvaluationCategory(value) {
  const category = sanitizeString(value, { field: "evaluation_category", required: true, max: 64 }).toLowerCase();
  if (!PLAN_CATEGORIES.has(category)) {
    throw new Error("invalid_evaluation_category");
  }
  return category;
}

function normalizeScope(value) {
  const scope = sanitizeString(value, { field: "scope", required: true, max: 32 }).toLowerCase();
  if (!PLAN_SCOPES.has(scope)) {
    throw new Error("invalid_scope");
  }
  return scope;
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

function normalizeBlockId(value) {
  const id = sanitizeString(value, { field: "block_id", required: true, max: 64 });
  if (!isUuid(id)) {
    throw new Error("invalid_block_id");
  }
  return id;
}

function normalizeOrderedBlockIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("invalid_ordered_block_ids");
  }
  return value.map((entry) => {
    const id = sanitizeString(entry, { field: "plan_block_id", required: true, max: 64 });
    if (!isUuid(id)) {
      throw new Error("invalid_plan_block_id");
    }
    return id;
  });
}

router.get("/:orgId/evaluation-plans", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const filters = {};
  try {
    if (req.query?.sport !== undefined) {
      filters.sport = normalizeSport(req.query.sport);
    }
    if (req.query?.scope !== undefined) {
      filters.scope = normalizeScope(req.query.scope);
    }
    if (req.query?.evaluation_category !== undefined) {
      filters.evaluationCategory = normalizeEvaluationCategory(req.query.evaluation_category);
    }
    if (req.query?.team_id !== undefined) {
      filters.teamId = sanitizeTeamId(req.query.team_id);
    }
  } catch (err) {
    return badRequest(res, err.message || "invalid_filter");
  }

  try {
    const items = await listEvaluationPlansForOrg({ orgId, filters });
    return res.status(200).json({ items });
  } catch (err) {
    console.error("[evaluation-plans.list] failed", err);
    return res.status(500).json({ error: "list_evaluation_plans_failed" });
  }
});

router.post("/:orgId/evaluation-plans", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, CREATE_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  let name;
  let sport;
  let ageGroup;
  let gender;
  let evaluationCategory;
  let scope;
  let teamId;

  try {
    name = normalizeName(body.name);
    sport = normalizeSport(body.sport);
    ageGroup = normalizeOptionalField(body.age_group, { field: "age_group", max: 64 });
    gender = normalizeOptionalField(body.gender, { field: "gender", max: 32 });
    evaluationCategory = normalizeEvaluationCategory(body.evaluation_category);
    scope = normalizeScope(body.scope);
    teamId = sanitizeTeamId(body.team_id);
  } catch (err) {
    return badRequest(res, err.message || "invalid_payload");
  }

  try {
    const item = await createEvaluationPlanForOrg({
      orgId,
      teamId,
      name,
      sport,
      ageGroup,
      gender,
      evaluationCategory,
      scope,
      createdByUserId: req.user?.id ?? null,
    });
    return res.status(201).json({ item });
  } catch (err) {
    if (err?.code === "team_not_found") {
      return res.status(400).json({ error: "team_not_found" });
    }
    if (err?.code === "invalid_scope_team") {
      return res.status(400).json({ error: "invalid_scope_team" });
    }
    console.error("[evaluation-plans.create] failed", err);
    return res.status(500).json({ error: "create_evaluation_plan_failed" });
  }
});

router.get("/:orgId/evaluation-plans/:planId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const planId = req.params.planId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  if (!isUuid(planId)) {
    return badRequest(res, "invalid_plan_id");
  }

  const item = await getEvaluationPlanForOrg({ orgId, planId });
  if (!item) {
    return res.status(404).json({ error: "evaluation_plan_not_found" });
  }
  return res.status(200).json({ item });
});

router.patch("/:orgId/evaluation-plans/:planId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const planId = req.params.planId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  if (!isUuid(planId)) {
    return badRequest(res, "invalid_plan_id");
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, PATCH_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  if (!Object.keys(body).length) {
    return badRequest(res, "empty_patch");
  }

  const patch = {};

  try {
    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      patch.name = normalizeName(body.name);
    }
    if (Object.prototype.hasOwnProperty.call(body, "sport")) {
      patch.sport = normalizeSport(body.sport);
    }
    if (Object.prototype.hasOwnProperty.call(body, "age_group")) {
      patch.ageGroup = normalizeOptionalField(body.age_group, { field: "age_group", max: 64 });
    }
    if (Object.prototype.hasOwnProperty.call(body, "gender")) {
      patch.gender = normalizeOptionalField(body.gender, { field: "gender", max: 32 });
    }
    if (Object.prototype.hasOwnProperty.call(body, "evaluation_category")) {
      patch.evaluationCategory = normalizeEvaluationCategory(body.evaluation_category);
    }
    if (Object.prototype.hasOwnProperty.call(body, "scope")) {
      patch.scope = normalizeScope(body.scope);
    }
    if (Object.prototype.hasOwnProperty.call(body, "team_id")) {
      patch.teamId = sanitizeTeamId(body.team_id);
    }
  } catch (err) {
    return badRequest(res, err.message || "invalid_patch");
  }

  if (!Object.keys(patch).length) {
    return badRequest(res, "no_fields_to_update");
  }

  try {
    const updated = await updateEvaluationPlanForOrg({ orgId, planId, patch });
    if (!updated) {
      return res.status(404).json({ error: "evaluation_plan_not_found" });
    }
    return res.status(200).json({ item: updated });
  } catch (err) {
    if (err?.code === "team_not_found") {
      return res.status(400).json({ error: "team_not_found" });
    }
    if (err?.code === "invalid_scope_team") {
      return res.status(400).json({ error: "invalid_scope_team" });
    }
    console.error("[evaluation-plans.patch] failed", err);
    return res.status(500).json({ error: "update_evaluation_plan_failed" });
  }
});

router.get("/:orgId/evaluation-plans/:planId/blocks", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const planId = req.params.planId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(planId)) {
    return badRequest(res, "invalid_plan_id");
  }

  try {
    const items = await listEvaluationPlanBlocksForOrg({ orgId, planId });
    return res.status(200).json({ items });
  } catch (err) {
    if (err?.code === "evaluation_plan_not_found") {
      return res.status(404).json({ error: "evaluation_plan_not_found" });
    }
    if (err?.code === "evaluation_block_not_found") {
      return res.status(404).json({ error: "evaluation_block_not_found" });
    }
    console.error("[evaluation-plan-blocks.list] failed", err);
    return res.status(500).json({ error: "list_evaluation_plan_blocks_failed" });
  }
});

router.post("/:orgId/evaluation-plans/:planId/blocks", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const planId = req.params.planId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(planId)) {
    return badRequest(res, "invalid_plan_id");
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, PLAN_BLOCK_CREATE_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  let blockId;
  try {
    blockId = normalizeBlockId(body.block_id);
  } catch (err) {
    return badRequest(res, err.message || "invalid_block_id");
  }

  try {
    const item = await addEvaluationPlanBlockForOrg({ orgId, planId, blockId });
    return res.status(201).json({ item });
  } catch (err) {
    if (err?.code === "evaluation_plan_not_found") {
      return res.status(404).json({ error: "evaluation_plan_not_found" });
    }
    if (err?.code === "evaluation_block_not_found") {
      return res.status(404).json({ error: "evaluation_block_not_found" });
    }
    console.error("[evaluation-plan-blocks.create] failed", err);
    return res.status(500).json({ error: "add_evaluation_plan_block_failed" });
  }
});

router.delete("/:orgId/evaluation-plans/:planId/blocks/:planBlockId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const planId = req.params.planId;
  const planBlockId = req.params.planBlockId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(planId) || !isUuid(planBlockId)) {
    return badRequest(res, "invalid_plan_block_id");
  }

  try {
    await removeEvaluationPlanBlockForOrg({ orgId, planId, planBlockId });
    return res.status(204).send();
  } catch (err) {
    if (err?.code === "evaluation_plan_not_found") {
      return res.status(404).json({ error: "evaluation_plan_not_found" });
    }
    if (err?.code === "plan_block_not_found") {
      return res.status(404).json({ error: "plan_block_not_found" });
    }
    console.error("[evaluation-plan-blocks.delete] failed", err);
    return res.status(500).json({ error: "delete_evaluation_plan_block_failed" });
  }
});

router.post("/:orgId/evaluation-plans/:planId/blocks/:planBlockId/duplicate", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const planId = req.params.planId;
  const planBlockId = req.params.planBlockId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(planId) || !isUuid(planBlockId)) {
    return badRequest(res, "invalid_plan_block_id");
  }

  try {
    const item = await duplicateEvaluationPlanBlockForOrg({ orgId, planId, planBlockId });
    return res.status(201).json({ item });
  } catch (err) {
    if (err?.code === "evaluation_plan_not_found") {
      return res.status(404).json({ error: "evaluation_plan_not_found" });
    }
    if (err?.code === "plan_block_not_found") {
      return res.status(404).json({ error: "plan_block_not_found" });
    }
    if (err?.code === "evaluation_block_not_found") {
      return res.status(404).json({ error: "evaluation_block_not_found" });
    }
    console.error("[evaluation-plan-blocks.duplicate] failed", err);
    return res.status(500).json({ error: "duplicate_evaluation_plan_block_failed" });
  }
});

router.patch("/:orgId/evaluation-plans/:planId/reorder", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const planId = req.params.planId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(planId)) {
    return badRequest(res, "invalid_plan_id");
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, PLAN_BLOCK_REORDER_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  let orderedIds;
  try {
    orderedIds = normalizeOrderedBlockIds(body.ordered_block_ids);
  } catch (err) {
    return badRequest(res, err.message || "invalid_ordered_block_ids");
  }

  try {
    const items = await reorderEvaluationPlanBlocksForOrg({ orgId, planId, orderedIds });
    return res.status(200).json({ items });
  } catch (err) {
    if (err?.code === "evaluation_plan_not_found") {
      return res.status(404).json({ error: "evaluation_plan_not_found" });
    }
    if (err?.code === "invalid_reorder") {
      return res.status(400).json({ error: "invalid_reorder" });
    }
    if (err?.code === "evaluation_block_not_found") {
      return res.status(404).json({ error: "evaluation_block_not_found" });
    }
    console.error("[evaluation-plan-blocks.reorder] failed", err);
    return res.status(500).json({ error: "reorder_evaluation_plan_blocks_failed" });
  }
});

router.post("/:orgId/evaluation-plan-strength", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationPlansAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const body = req.body || {};
  const planId = body.plan_id || body.planId || null;
  let blocksInput = Array.isArray(body.blocks) ? body.blocks : null;

  if (!blocksInput && planId) {
    if (!isUuid(planId)) {
      return badRequest(res, "invalid_plan_id");
    }
    try {
      const planBlocks = await listEvaluationPlanBlocksForOrg({ orgId, planId });
      blocksInput = planBlocks.map((entry) => ({
        block_id: entry.block_id,
        categories: entry.block?.categories ?? [],
        difficulty: entry.block?.difficulty ?? null,
      }));
    } catch (err) {
      if (err?.code === "evaluation_plan_not_found") {
        return res.status(404).json({ error: "evaluation_plan_not_found" });
      }
      if (err?.code === "evaluation_block_not_found") {
        return res.status(404).json({ error: "evaluation_block_not_found" });
      }
      console.error("[evaluation-plan-strength.planBlocks] failed", err);
      return res.status(500).json({ error: "load_plan_blocks_failed" });
    }
  }

  if (!blocksInput || !blocksInput.length) {
    return badRequest(res, "blocks_required");
  }

  try {
    const score = await evaluatePlanStrength({ orgId, blocks: blocksInput });
    return res.status(200).json(score);
  } catch (err) {
    if (err?.code === "bad_request") {
      return badRequest(res, err.message || "invalid_blocks");
    }
    console.error("[evaluation-plan-strength.evaluate] failed", err);
    return res.status(500).json({ error: "evaluate_plan_strength_failed" });
  }
});

export default router;
