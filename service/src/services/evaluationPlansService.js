import {
  createEvaluationPlan,
  getEvaluationPlanById,
  listEvaluationPlans,
  updateEvaluationPlan,
  listEvaluationPlanBlocks,
  listEvaluationPlanBlocksRaw,
  createEvaluationPlanBlock,
  deleteEvaluationPlanBlock,
  getEvaluationPlanBlockById,
  setEvaluationPlanBlockPositions,
} from "../repositories/evaluationPlansRepo.js";
import { getTeamById } from "../repositories/teamsRepo.js";
import { getEvaluationBlockById } from "../repositories/evaluationBlocksRepo.js";

function teamNotFoundError() {
  const err = new Error("team_not_found");
  err.code = "team_not_found";
  return err;
}

function invalidScopeTeamError() {
  const err = new Error("invalid_scope_team");
  err.code = "invalid_scope_team";
  return err;
}

async function resolveTeamForScope({ orgId, scope, teamId }) {
  if (!scope) throw invalidScopeTeamError();
  const normalizedScope = scope.toLowerCase();

  if (normalizedScope === "club") {
    if (teamId !== undefined && teamId !== null) {
      throw invalidScopeTeamError();
    }
    return { scope: "club", teamId: null };
  }

  if (normalizedScope === "team") {
    if (!teamId) {
      throw invalidScopeTeamError();
    }
    const team = await getTeamById(orgId, teamId);
    if (!team) {
      throw teamNotFoundError();
    }
    return { scope: "team", teamId: team.id };
  }

  throw invalidScopeTeamError();
}

export async function createEvaluationPlanForOrg({
  orgId,
  teamId,
  name,
  sport,
  ageGroup,
  gender,
  evaluationCategory,
  scope,
  createdByUserId,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!createdByUserId) throw new Error("createdByUserId required");

  const { teamId: resolvedTeamId, scope: normalizedScope } = await resolveTeamForScope({
    orgId,
    scope,
    teamId,
  });

  return await createEvaluationPlan({
    orgId,
    teamId: resolvedTeamId,
    name,
    sport,
    ageGroup,
    gender,
    evaluationCategory,
    scope: normalizedScope,
    createdByUserId,
  });
}

export async function listEvaluationPlansForOrg({ orgId, filters = {} }) {
  if (!orgId) throw new Error("orgId required");
  return await listEvaluationPlans({ orgId, filters });
}

export async function getEvaluationPlanForOrg({ orgId, planId }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) return null;
  return await getEvaluationPlanById({ orgId, planId });
}

export async function updateEvaluationPlanForOrg({ orgId, planId, patch = {} }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");

  const existing = await getEvaluationPlanById({ orgId, planId });
  if (!existing) {
    return null;
  }

  const nextScope = Object.prototype.hasOwnProperty.call(patch, "scope") ? patch.scope : existing.scope;
  const nextTeamInput = Object.prototype.hasOwnProperty.call(patch, "teamId") ? patch.teamId : existing.team_id;
  const normalizedScopeInput = nextScope;
  const effectiveTeamInput =
    normalizedScopeInput && normalizedScopeInput.toLowerCase() === "club" ? null : nextTeamInput;

  const { teamId: resolvedTeamId, scope: normalizedScope } = await resolveTeamForScope({
    orgId,
    scope: normalizedScopeInput,
    teamId: effectiveTeamInput,
  });

  const repoPatch = { ...patch, scope: normalizedScope, teamId: resolvedTeamId };

  return await updateEvaluationPlan({ orgId, planId, patch: repoPatch });
}

function planNotFoundError() {
  const err = new Error("evaluation_plan_not_found");
  err.code = "evaluation_plan_not_found";
  return err;
}

function planBlockNotFoundError() {
  const err = new Error("plan_block_not_found");
  err.code = "plan_block_not_found";
  return err;
}

function blockNotVisibleError() {
  const err = new Error("evaluation_block_not_found");
  err.code = "evaluation_block_not_found";
  return err;
}

function invalidReorderError() {
  const err = new Error("invalid_reorder");
  err.code = "invalid_reorder";
  return err;
}

async function ensurePlanForOrgOrThrow({ orgId, planId }) {
  const plan = await getEvaluationPlanById({ orgId, planId });
  if (!plan) {
    throw planNotFoundError();
  }
  return plan;
}

async function ensurePlanBlockForPlan({ planId, planBlockId }) {
  const planBlock = await getEvaluationPlanBlockById({ planId, planBlockId });
  if (!planBlock) {
    throw planBlockNotFoundError();
  }
  return planBlock;
}

async function ensureBlockVisibleForOrg({ orgId, blockId }) {
  const block = await getEvaluationBlockById({ orgId, blockId, includePlatform: true });
  if (!block) {
    throw blockNotVisibleError();
  }
  return block;
}

async function decoratePlanBlocks({ orgId, rows }) {
  const cache = new Map();
  const items = [];
  for (const row of rows) {
    let block = row.block;
    if (!block) {
      if (!cache.has(row.block_id)) {
        cache.set(row.block_id, await ensureBlockVisibleForOrg({ orgId, blockId: row.block_id }));
      }
      block = cache.get(row.block_id);
    }
    items.push({ ...row, block });
  }
  return items;
}

export async function listEvaluationPlanBlocksForOrg({ orgId, planId }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");
  await ensurePlanForOrgOrThrow({ orgId, planId });
  const rows = await listEvaluationPlanBlocks({ planId });
  return await decoratePlanBlocks({ orgId, rows });
}

export async function addEvaluationPlanBlockForOrg({ orgId, planId, blockId }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");
  if (!blockId) throw new Error("blockId required");

  await ensurePlanForOrgOrThrow({ orgId, planId });
  const block = await ensureBlockVisibleForOrg({ orgId, blockId });
  const existing = await listEvaluationPlanBlocksRaw({ planId });
  const position = existing.length + 1;
  const created = await createEvaluationPlanBlock({ planId, blockId, position });
  return { ...created, block };
}

export async function removeEvaluationPlanBlockForOrg({ orgId, planId, planBlockId }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");
  if (!planBlockId) throw new Error("planBlockId required");

  await ensurePlanForOrgOrThrow({ orgId, planId });
  await ensurePlanBlockForPlan({ planId, planBlockId });
  const deleted = await deleteEvaluationPlanBlock({ planId, planBlockId });
  if (!deleted) {
    throw planBlockNotFoundError();
  }
  const remaining = await listEvaluationPlanBlocksRaw({ planId });
  await setEvaluationPlanBlockPositions({ planId, orderedIds: remaining.map((row) => row.id) });
  return true;
}

export async function duplicateEvaluationPlanBlockForOrg({ orgId, planId, planBlockId }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");
  if (!planBlockId) throw new Error("planBlockId required");

  await ensurePlanForOrgOrThrow({ orgId, planId });
  const planBlock = await ensurePlanBlockForPlan({ planId, planBlockId });
  const block = await ensureBlockVisibleForOrg({ orgId, blockId: planBlock.block_id });

  const current = await listEvaluationPlanBlocksRaw({ planId });
  const newPosition = current.length + 1;
  const duplicate = await createEvaluationPlanBlock({ planId, blockId: planBlock.block_id, position: newPosition });

  const newOrder = [];
  for (const row of current) {
    newOrder.push(row.id);
    if (row.id === planBlockId) {
      newOrder.push(duplicate.id);
    }
  }
  if (!newOrder.includes(duplicate.id)) {
    newOrder.push(duplicate.id);
  }
  await setEvaluationPlanBlockPositions({ planId, orderedIds: newOrder });
  const updated = await getEvaluationPlanBlockById({ planId, planBlockId: duplicate.id });
  return { ...updated, block };
}

export async function reorderEvaluationPlanBlocksForOrg({ orgId, planId, orderedIds }) {
  if (!orgId) throw new Error("orgId required");
  if (!planId) throw new Error("planId required");
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw invalidReorderError();
  }

  await ensurePlanForOrgOrThrow({ orgId, planId });
  const current = await listEvaluationPlanBlocksRaw({ planId });
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

  await setEvaluationPlanBlockPositions({ planId, orderedIds });
  const rows = await listEvaluationPlanBlocks({ planId });
  return await decoratePlanBlocks({ orgId, rows });
}
