import {
  createEvaluationBlock,
  getEvaluationBlockById,
  listEvaluationBlocks,
  listPopularEvaluationBlocks,
  updateEvaluationBlock,
  setEvaluationBlockCategories,
} from "../repositories/evaluationBlocksRepo.js";
import { getTeamById } from "../repositories/teamsRepo.js";

export const BLOCK_CATEGORY_IDS = Object.freeze([
  "technical",
  "physical",
  "tactical",
  "mental",
  "decision_making",
  "discipline",
]);

const BLOCK_CATEGORY_SET = new Set(BLOCK_CATEGORY_IDS);

function teamNotFoundError() {
  const err = new Error("team_not_found");
  err.code = "team_not_found";
  return err;
}

function invalidCategoryError() {
  const err = new Error("invalid_category");
  err.code = "invalid_category";
  return err;
}

function normalizeCategoriesInput(categories, { allowUndefined = false } = {}) {
  if (categories === undefined) {
    return allowUndefined ? undefined : [];
  }
  if (categories === null) return [];
  if (!Array.isArray(categories)) {
    throw invalidCategoryError();
  }
  const normalized = [];
  for (const value of categories) {
    const slug = typeof value === "string" ? value.trim().toLowerCase() : null;
    if (!slug) {
      throw invalidCategoryError();
    }
    if (!BLOCK_CATEGORY_SET.has(slug)) {
      throw invalidCategoryError();
    }
    if (!normalized.includes(slug)) {
      normalized.push(slug);
    }
  }
  return normalized;
}

async function resolveTeamId(orgId, teamId) {
  if (teamId === undefined) return undefined;
  if (teamId === null) return null;
  const team = await getTeamById(orgId, teamId);
  if (!team) {
    throw teamNotFoundError();
  }
  return team.id;
}

export async function createEvaluationBlockForOrg({
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
  categories = [],
  createdByType,
  createdById,
}) {
  if (!orgId) throw new Error("orgId required");

  const resolvedTeamId = await resolveTeamId(orgId, teamId);
  const normalizedCategories = normalizeCategoriesInput(categories, { allowUndefined: false });

  const block = await createEvaluationBlock({
    orgId,
    teamId: resolvedTeamId ?? null,
    name,
    sport,
    evaluationType,
    scoringMethod,
    scoringConfig,
    instructions,
    objective,
    difficulty,
    createdByType,
    createdById,
  });

  if (normalizedCategories.length) {
    await setEvaluationBlockCategories({ blockId: block.id, categories: normalizedCategories });
  }

  return await getEvaluationBlockById({ orgId, blockId: block.id, includePlatform: true });
}

export async function listEvaluationBlocksForOrg({ orgId, filters = {} }) {
  if (!orgId) throw new Error("orgId required");
  return await listEvaluationBlocks({ orgId, filters });
}

export async function listPopularEvaluationBlocksForOrg({ orgId, filters = {} }) {
  if (!orgId) throw new Error("orgId required");
  return await listPopularEvaluationBlocks({ orgId, filters });
}

export async function getEvaluationBlockForOrg({ orgId, blockId }) {
  if (!blockId) return null;
  if (!orgId) return null;
  return await getEvaluationBlockById({ orgId, blockId, includePlatform: true });
}

export async function updateEvaluationBlockForOrg({ orgId, blockId, patch }) {
  if (!orgId) throw new Error("orgId required");
  if (!blockId) throw new Error("blockId required");

  let resolvedTeamId;
  if (Object.prototype.hasOwnProperty.call(patch, "teamId")) {
    resolvedTeamId = await resolveTeamId(orgId, patch.teamId);
  }

  const categoriesProvided = Object.prototype.hasOwnProperty.call(patch, "categories");
  const normalizedCategories = categoriesProvided
    ? normalizeCategoriesInput(patch.categories, { allowUndefined: false })
    : undefined;

  const normalizedPatch = { ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "teamId")) {
    normalizedPatch.teamId = resolvedTeamId;
  }

  const repoPatch = { ...normalizedPatch };
  delete repoPatch.categories;
  const hasRepoFields = Object.keys(repoPatch).length > 0;

  if (hasRepoFields) {
    const updated = await updateEvaluationBlock({ orgId, blockId, patch: repoPatch });
    if (!updated) return null;
  }

  if (categoriesProvided) {
    await setEvaluationBlockCategories({ blockId, categories: normalizedCategories || [] });
  }

  return await getEvaluationBlockById({ orgId, blockId, includePlatform: true });
}
