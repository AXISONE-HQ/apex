import {
  createEvaluationSession,
  getEvaluationSessionById,
  listEvaluationSessions,
  completeEvaluationSession,
  findEvaluationSessionByEventPlan,
} from "../repositories/evaluationSessionsRepo.js";
import { getEventById } from "../repositories/eventsRepo.js";
import { getEvaluationPlanById, listEvaluationPlanBlocks } from "../repositories/evaluationPlansRepo.js";
import { getPlayerByIdAndOrg } from "../repositories/playersRepo.js";
import {
  createSessionPlayerEvaluation,
  getSessionPlayerEvaluationById,
  getSessionPlayerEvaluation,
  listSessionPlayerEvaluations,
  listSessionScores,
  listSessionScoresByPlayer,
  updateSessionPlayerEvaluation,
  createSessionEvaluationLog,
} from "../repositories/playerEvaluationsRepo.js";

function eventNotFoundError() {
  const err = new Error("event_not_found");
  err.code = "event_not_found";
  return err;
}

function evaluationPlanNotFoundError() {
  const err = new Error("evaluation_plan_not_found");
  err.code = "evaluation_plan_not_found";
  return err;
}

function eventMissingTeamError() {
  const err = new Error("event_team_required");
  err.code = "event_team_required";
  return err;
}

function invalidPlanTeamError() {
  const err = new Error("invalid_plan_team");
  err.code = "invalid_plan_team";
  return err;
}

function sessionAlreadyExistsError() {
  const err = new Error("session_already_exists");
  err.code = "session_already_exists";
  return err;
}

function evaluationSessionNotFoundError() {
  const err = new Error("evaluation_session_not_found");
  err.code = "evaluation_session_not_found";
  return err;
}

function playerNotFoundError() {
  const err = new Error("player_not_found");
  err.code = "player_not_found";
  return err;
}

function playerNotOnTeamError() {
  const err = new Error("player_not_on_team");
  err.code = "player_not_on_team";
  return err;
}

function evaluationBlockNotFoundError() {
  const err = new Error("evaluation_block_not_found");
  err.code = "evaluation_block_not_found";
  return err;
}

function blockNotInPlanError() {
  const err = new Error("block_not_in_plan");
  err.code = "block_not_in_plan";
  err.message = "block is not part of the evaluation plan";
  return err;
}

function playerEvaluationNotFoundError() {
  const err = new Error("player_evaluation_not_found");
  err.code = "player_evaluation_not_found";
  return err;
}

function invalidScoreError(message) {
  const err = new Error(message || "invalid_score");
  err.code = "bad_request";
  return err;
}

export async function startEvaluationSessionForOrg({
  orgId,
  eventId,
  evaluationPlanId,
  createdByUserId,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!eventId || !evaluationPlanId || !createdByUserId) {
    throw new Error("missing_fields");
  }

  const event = await getEventById({ id: eventId, orgId });
  if (!event) {
    throw eventNotFoundError();
  }
  const eventTeamId = event.team_id ?? event.teamId ?? null;
  if (!eventTeamId) {
    throw eventMissingTeamError();
  }

  const plan = await getEvaluationPlanById({ orgId, planId: evaluationPlanId });
  if (!plan) {
    throw evaluationPlanNotFoundError();
  }

  const planTeamId = plan.team_id ?? plan.teamId ?? null;

  if (plan.scope === "team") {
    if (!planTeamId || planTeamId !== eventTeamId) {
      throw invalidPlanTeamError();
    }
  }

  const existing = await findEvaluationSessionByEventPlan({ orgId, eventId, evaluationPlanId });
  if (existing) {
    throw sessionAlreadyExistsError();
  }

  try {
    return await createEvaluationSession({
      orgId,
      teamId: eventTeamId,
      eventId,
      evaluationPlanId,
      createdByUserId,
    });
  } catch (err) {
    if (err?.code === "session_already_exists") {
      throw sessionAlreadyExistsError();
    }
    throw err;
  }
}

export async function getEvaluationSessionForOrg({ orgId, sessionId }) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) return null;
  return await getEvaluationSessionById({ orgId, sessionId });
}

export async function listEvaluationSessionsForOrg({ orgId }) {
  if (!orgId) throw new Error("orgId required");
  return await listEvaluationSessions({ orgId });
}

export async function completeEvaluationSessionForOrg({ orgId, sessionId }) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) throw new Error("sessionId required");
  return await completeEvaluationSession({ orgId, sessionId });
}

async function loadSessionContext(orgId, sessionId) {
  const session = await getEvaluationSessionById({ orgId, sessionId });
  if (!session) {
    throw evaluationSessionNotFoundError();
  }
  const planBlocks = await listEvaluationPlanBlocks({ planId: session.evaluation_plan_id });
  const blockMap = new Map();
  for (const row of planBlocks) {
    if (row.block) {
      blockMap.set(row.block_id, row.block);
    }
  }
  return { session, blockMap };
}

function ensureBlockInPlan(blockMap, blockId) {
  const block = blockMap.get(blockId);
  if (!block) {
    throw blockNotInPlanError();
  }
  return block;
}

async function ensurePlayerOnSessionTeam(orgId, session, playerId) {
  const player = await getPlayerByIdAndOrg(playerId, orgId);
  if (!player) {
    throw playerNotFoundError();
  }
  const playerTeamId = player.team_id ?? player.teamId ?? null;
  const sessionTeamId = session.team_id ?? session.teamId ?? null;
  if (!playerTeamId || !sessionTeamId || playerTeamId !== sessionTeamId) {
    throw playerNotOnTeamError();
  }
  return player;
}

function normalizeNotes(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw invalidScoreError("notes must be a string");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1000) {
    throw invalidScoreError("notes must be 1000 characters or fewer");
  }
  return trimmed;
}

function normalizeScoreForBlock(block, rawScore) {
  if (!rawScore || typeof rawScore !== "object" || Array.isArray(rawScore)) {
    throw invalidScoreError("score must be an object");
  }
  const method = block.scoring_method;
  if (method === "numeric_scale") {
    const value = Number(rawScore.value);
    if (!Number.isFinite(value)) {
      throw invalidScoreError("numeric scores require a numeric value");
    }
    return { value };
  }
  if (method === "rating_scale") {
    if (!Array.isArray(block.scoring_config?.options) || block.scoring_config.options.length === 0) {
      throw invalidScoreError("rating scale options missing");
    }
    const rating = typeof rawScore.rating === "string" ? rawScore.rating.trim() : "";
    if (!rating) {
      throw invalidScoreError("rating scores require a rating value");
    }
    const allowed = block.scoring_config.options.map((opt) => String(opt).trim());
    if (!allowed.includes(rating)) {
      throw invalidScoreError("rating is not part of the scoring options");
    }
    return { rating };
  }
  if (method === "custom_metric") {
    const value = Number(rawScore.value);
    const unit = typeof rawScore.unit === "string" ? rawScore.unit.trim() : "";
    if (!Number.isFinite(value) || !unit) {
      throw invalidScoreError("custom metric scores require value and unit");
    }
    const result = { value, unit };
    if (rawScore.value_label && typeof rawScore.value_label === "string" && rawScore.value_label.trim()) {
      result.value_label = rawScore.value_label.trim();
    }
    return result;
  }
  throw invalidScoreError("unsupported scoring method");
}

function clampToPercent(value) {
  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizeScoreToHundred(block, score) {
  if (!block || !score) return null;
  const method = block.scoring_method;
  if (method === "numeric_scale") {
    const min = Number(block.scoring_config?.min ?? 0);
    const max = Number(block.scoring_config?.max ?? 0);
    if (!Number.isFinite(score.value) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
      return null;
    }
    const ratio = ((score.value - min) / (max - min)) * 100;
    return clampToPercent(ratio);
  }
  if (method === "rating_scale") {
    const options = Array.isArray(block.scoring_config?.options) ? block.scoring_config.options : [];
    if (!options.length) return null;
    const normalizedOptions = options.map((opt) => String(opt).trim());
    const rating = typeof score.rating === "string" ? score.rating.trim() : "";
    const index = normalizedOptions.indexOf(rating);
    if (index < 0) return null;
    if (normalizedOptions.length === 1) return clampToPercent(100);
    const ratio = (index / (normalizedOptions.length - 1)) * 100;
    return clampToPercent(ratio);
  }
  if (method === "custom_metric") {
    const value = Number(score.value);
    if (!Number.isFinite(value)) return null;
    return value;
  }
  return null;
}

function formatPlayerName(player) {
  if (!player) return null;
  const displayName = player.display_name ?? player.displayName;
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }
  const first = player.first_name ?? player.firstName ?? "";
  const last = player.last_name ?? player.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || null;
}

function formatPlayerSummary(player) {
  if (!player) return null;
  return {
    id: player.id,
    first_name: player.first_name ?? player.firstName ?? null,
    last_name: player.last_name ?? player.lastName ?? null,
    display_name: player.display_name ?? player.displayName ?? null,
    jersey_number: player.jersey_number ?? player.jerseyNumber ?? null,
    team_id: player.team_id ?? player.teamId ?? null,
  };
}

function formatBlockSummary(block) {
  if (!block) return null;
  return {
    id: block.id,
    name: block.name,
    scoring_method: block.scoring_method,
    scoring_config: block.scoring_config,
  };
}

function formatScoreResponse(evaluation, player, block) {
  return {
    id: evaluation.id,
    session_id: evaluation.session_id,
    player_id: evaluation.player_id,
    player: formatPlayerSummary(player),
    block_id: evaluation.block_id,
    block: formatBlockSummary(block),
    score: evaluation.score,
    notes: evaluation.notes,
    created_at: evaluation.created_at,
    updated_at: evaluation.updated_at,
  };
}

export async function submitPlayerScoreForSession({
  orgId,
  sessionId,
  playerId,
  blockId,
  score,
  notes,
  actorUserId,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) throw new Error("sessionId required");
  if (!playerId || !blockId) throw new Error("playerId and blockId required");

  const { session, blockMap } = await loadSessionContext(orgId, sessionId);
  const block = ensureBlockInPlan(blockMap, blockId);
  const player = await ensurePlayerOnSessionTeam(orgId, session, playerId);
  const normalizedScore = normalizeScoreForBlock(block, score);
  const normalizedNotes = normalizeNotes(notes);

  let evaluation = await getSessionPlayerEvaluation({ orgId, sessionId, playerId, blockId });
  if (evaluation) {
    const notesValue = normalizedNotes !== undefined ? normalizedNotes : evaluation.notes;
    const updated = await updateSessionPlayerEvaluation({
      orgId,
      sessionId,
      playerEvaluationId: evaluation.id,
      score: normalizedScore,
      notes: notesValue,
    });
    await createSessionEvaluationLog({
      playerEvaluationId: evaluation.id,
      previousScore: evaluation.score,
      newScore: normalizedScore,
      editedByUserId: actorUserId ?? null,
    });
    return formatScoreResponse(updated, player, block);
  }

  try {
    const created = await createSessionPlayerEvaluation({
      orgId,
      sessionId,
      playerId,
      blockId,
      score: normalizedScore,
      notes: normalizedNotes ?? null,
    });
    return formatScoreResponse(created, player, block);
  } catch (err) {
    if (err?.code === "player_evaluation_exists") {
      evaluation = await getSessionPlayerEvaluation({ orgId, sessionId, playerId, blockId });
      if (!evaluation) {
        throw playerEvaluationNotFoundError();
      }
      const notesValue = normalizedNotes !== undefined ? normalizedNotes : evaluation.notes;
      const updated = await updateSessionPlayerEvaluation({
        orgId,
        sessionId,
        playerEvaluationId: evaluation.id,
        score: normalizedScore,
        notes: notesValue,
      });
      await createSessionEvaluationLog({
        playerEvaluationId: evaluation.id,
        previousScore: evaluation.score,
        newScore: normalizedScore,
        editedByUserId: actorUserId ?? null,
      });
      return formatScoreResponse(updated, player, block);
    }
    throw err;
  }
}

export async function updatePlayerScoreForSession({
  orgId,
  sessionId,
  playerEvaluationId,
  score,
  notes,
  actorUserId,
}) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) throw new Error("sessionId required");
  if (!playerEvaluationId) throw new Error("playerEvaluationId required");

  const { session, blockMap } = await loadSessionContext(orgId, sessionId);
  const evaluation = await getSessionPlayerEvaluationById({ orgId, sessionId, playerEvaluationId });
  if (!evaluation) {
    throw playerEvaluationNotFoundError();
  }
  const block = ensureBlockInPlan(blockMap, evaluation.block_id);
  const player = await getPlayerByIdAndOrg(evaluation.player_id, orgId);
  const normalizedScore = normalizeScoreForBlock(block, score);
  const normalizedNotes = normalizeNotes(notes);
  const notesValue = normalizedNotes !== undefined ? normalizedNotes : evaluation.notes;

  const updated = await updateSessionPlayerEvaluation({
    orgId,
    sessionId,
    playerEvaluationId,
    score: normalizedScore,
    notes: notesValue,
  });
  await createSessionEvaluationLog({
    playerEvaluationId,
    previousScore: evaluation.score,
    newScore: normalizedScore,
    editedByUserId: actorUserId ?? null,
  });
  return formatScoreResponse(updated, player, block);
}

export async function listPlayerScoresForSession({ orgId, sessionId }) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) throw new Error("sessionId required");

  const { blockMap } = await loadSessionContext(orgId, sessionId);
  const evaluations = await listSessionPlayerEvaluations({ orgId, sessionId });
  const playerCache = new Map();
  const items = [];
  for (const evaluation of evaluations) {
    if (!playerCache.has(evaluation.player_id)) {
      const player = await getPlayerByIdAndOrg(evaluation.player_id, orgId);
      playerCache.set(evaluation.player_id, player || null);
    }
    const player = playerCache.get(evaluation.player_id);
    const block = blockMap.get(evaluation.block_id) || null;
    items.push(formatScoreResponse(evaluation, player, block));
  }
  return items;
}

export async function getSessionSummaryForOrg({ orgId, sessionId }) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) throw new Error("sessionId required");

  const { blockMap } = await loadSessionContext(orgId, sessionId);
  const evaluations = await listSessionScores({ orgId, sessionId });
  const blockOrder = new Map();
  let orderIndex = 0;
  for (const blockId of blockMap.keys()) {
    blockOrder.set(blockId, orderIndex++);
  }

  const playerStats = new Map();
  const blockStats = new Map();
  const playerCache = new Map();

  for (const evaluation of evaluations) {
    const block = blockMap.get(evaluation.block_id);
    if (!block) continue;
    const normalized = normalizeScoreToHundred(block, evaluation.score);
    if (normalized === null) continue;

    if (!blockStats.has(block.id)) {
      blockStats.set(block.id, { block, total: 0, count: 0 });
    }
    const blockEntry = blockStats.get(block.id);
    blockEntry.total += normalized;
    blockEntry.count += 1;

    if (!playerStats.has(evaluation.player_id)) {
      playerStats.set(evaluation.player_id, { total: 0, count: 0 });
    }
    const playerEntry = playerStats.get(evaluation.player_id);
    playerEntry.total += normalized;
    playerEntry.count += 1;
  }

  const averageScoresByBlock = Array.from(blockStats.values())
    .map(({ block, total, count }) => ({
      block_id: block.id,
      block_name: block.name,
      average_score: count ? total / count : 0,
    }))
    .sort((a, b) => {
      const orderA = blockOrder.get(a.block_id) ?? 0;
      const orderB = blockOrder.get(b.block_id) ?? 0;
      return orderA - orderB;
    });

  const playerSummaries = [];
  for (const [playerId, data] of playerStats.entries()) {
    if (!playerCache.has(playerId)) {
      const player = await getPlayerByIdAndOrg(playerId, orgId);
      playerCache.set(playerId, player || null);
    }
    const player = playerCache.get(playerId);
    const overall = data.count ? data.total / data.count : 0;
    playerSummaries.push({
      player_id: playerId,
      player_name: formatPlayerName(player),
      overall_score: overall,
    });
  }

  playerSummaries.sort((a, b) => b.overall_score - a.overall_score);
  const topPlayers = playerSummaries.slice(0, 5);
  const lowestPlayers = [...playerSummaries].sort((a, b) => a.overall_score - b.overall_score).slice(0, 5);

  return {
    session_id: sessionId,
    players_evaluated: playerStats.size,
    blocks_evaluated: blockMap.size,
    average_scores_by_block: averageScoresByBlock,
    top_players: topPlayers,
    lowest_players: lowestPlayers,
  };
}

export async function getPlayerSessionSummaryForOrg({ orgId, sessionId, playerId }) {
  if (!orgId) throw new Error("orgId required");
  if (!sessionId) throw new Error("sessionId required");
  if (!playerId) throw new Error("playerId required");

  const { session, blockMap } = await loadSessionContext(orgId, sessionId);
  const player = await ensurePlayerOnSessionTeam(orgId, session, playerId);
  const evaluations = await listSessionScoresByPlayer({ orgId, sessionId, playerId });
  const blockOrder = new Map();
  let orderIndex = 0;
  for (const blockId of blockMap.keys()) {
    blockOrder.set(blockId, orderIndex++);
  }

  const blocks = [];
  const normalizedValues = [];
  for (const evaluation of evaluations) {
    const block = blockMap.get(evaluation.block_id);
    if (!block) continue;
    const normalized = normalizeScoreToHundred(block, evaluation.score);
    if (normalized !== null) {
      normalizedValues.push(normalized);
    }
    blocks.push({
      block_id: block.id,
      block_name: block.name,
      score: evaluation.score,
      normalized_score: normalized,
    });
  }

  blocks.sort((a, b) => {
    const orderA = blockOrder.get(a.block_id) ?? 0;
    const orderB = blockOrder.get(b.block_id) ?? 0;
    return orderA - orderB;
  });

  const overallScore = normalizedValues.length
    ? normalizedValues.reduce((sum, value) => sum + value, 0) / normalizedValues.length
    : null;

  return {
    player_id: playerId,
    player_name: formatPlayerName(player),
    blocks,
    overall_score: overallScore,
  };
}
