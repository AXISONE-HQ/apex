import { BLOCK_CATEGORY_IDS } from "./evaluationBlocksService.js";
import { getEvaluationBlockById } from "../repositories/evaluationBlocksRepo.js";

const CATEGORY_SET = new Set(BLOCK_CATEGORY_IDS);
const DIFFICULTY_VALUES = new Set(["easy", "medium", "hard"]);
const CATEGORY_BUCKETS = {
  skills: new Set(["technical", "decision_making", "mental"]),
  conditioning: new Set(["physical", "discipline"]),
  plays: new Set(["tactical"]),
};
const MIN_BLOCKS_FOR_STRONG = 8;

function badRequestError(message) {
  const err = new Error(message || "invalid_blocks");
  err.code = "bad_request";
  return err;
}

function sanitizeCategory(value) {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (!slug) return null;
  if (!CATEGORY_SET.has(slug)) return null;
  return slug;
}

function normalizeCategories(list) {
  if (!Array.isArray(list)) return [];
  const normalized = [];
  for (const entry of list) {
    const slug = sanitizeCategory(entry);
    if (slug && !normalized.includes(slug)) {
      normalized.push(slug);
    }
  }
  return normalized;
}

function normalizeDifficulty(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const slug = value.trim().toLowerCase();
    if (DIFFICULTY_VALUES.has(slug)) {
      return slug;
    }
  }
  return null;
}

async function hydrateBlockEntry({ orgId, entry }) {
  if (!entry || typeof entry !== "object") {
    throw badRequestError("invalid_block_entry");
  }

  const blockId = entry.block_id || entry.blockId;
  let categories = normalizeCategories(entry.categories);
  let difficulty = normalizeDifficulty(entry.difficulty);

  if ((!categories.length || !difficulty) && blockId) {
    const block = await getEvaluationBlockById({ orgId, blockId, includePlatform: true });
    if (block) {
      if (!categories.length) {
        categories = normalizeCategories(block.categories || []);
      }
      if (!difficulty) {
        difficulty = normalizeDifficulty(block.difficulty);
      }
    }
  }

  if (!categories.length) {
    throw badRequestError("block_categories_required");
  }

  return {
    blockId: blockId ?? null,
    categories,
    difficulty,
  };
}

function evaluateBuckets(hydratedBlocks) {
  const coverage = {
    skills: false,
    conditioning: false,
    plays: false,
  };

  for (const block of hydratedBlocks) {
    for (const category of block.categories) {
      if (CATEGORY_BUCKETS.skills.has(category)) {
        coverage.skills = true;
      }
      if (CATEGORY_BUCKETS.conditioning.has(category)) {
        coverage.conditioning = true;
      }
      if (CATEGORY_BUCKETS.plays.has(category)) {
        coverage.plays = true;
      }
    }
  }

  return coverage;
}

function collectDifficultyDistribution(hydratedBlocks) {
  const distribution = { easy: 0, medium: 0, hard: 0 };
  for (const block of hydratedBlocks) {
    if (block.difficulty && distribution.hasOwnProperty(block.difficulty)) {
      distribution[block.difficulty] += 1;
    }
  }
  return distribution;
}

export async function evaluatePlanStrength({ orgId, blocks }) {
  if (!orgId) throw new Error("orgId required");
  if (!Array.isArray(blocks) || !blocks.length) {
    throw badRequestError("blocks_required");
  }

  const hydrated = [];
  for (const entry of blocks) {
    const hydratedEntry = await hydrateBlockEntry({ orgId, entry });
    hydrated.push(hydratedEntry);
  }

  const blockCount = hydrated.length;
  const categoryCoverage = evaluateBuckets(hydrated);
  const difficultyDistribution = collectDifficultyDistribution(hydrated);

  const recommendations = [];
  let status = "strong";

  if (blockCount < MIN_BLOCKS_FOR_STRONG) {
    status = "needs_more_blocks";
    recommendations.push(`Add at least ${MIN_BLOCKS_FOR_STRONG - blockCount} more blocks to reach the minimum of ${MIN_BLOCKS_FOR_STRONG}.`);
  }

  const missingBuckets = Object.entries(categoryCoverage)
    .filter(([, covered]) => covered === false)
    .map(([bucket]) => bucket);

  if (missingBuckets.length) {
    status = status === "needs_more_blocks" ? status : "needs_balance";
    recommendations.push(`Add coverage for: ${missingBuckets.join(", ")}.`);
  }

  const response = {
    status,
    badge: status === "strong" ? "STRONG PLAN" : "NEEDS WORK",
    block_count: blockCount,
    min_block_threshold: MIN_BLOCKS_FOR_STRONG,
    category_coverage: categoryCoverage,
    difficulty_distribution: difficultyDistribution,
    recommendations,
    evaluated_at: new Date().toISOString(),
  };

  return response;
}
