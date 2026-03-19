import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import {
  startEvaluationSessionForOrg,
  listEvaluationSessionsForOrg,
  getEvaluationSessionForOrg,
  completeEvaluationSessionForOrg,
  submitPlayerScoreForSession,
  updatePlayerScoreForSession,
  listPlayerScoresForSession,
  getSessionSummaryForOrg,
  getPlayerSessionSummaryForOrg,
} from "../../services/evaluationSessionsService.js";

const router = Router({ mergeParams: true });

const START_FIELDS = new Set(["event_id", "evaluation_plan_id"]);
const SCORE_CREATE_FIELDS = new Set(["player_id", "block_id", "score", "notes"]);
const SCORE_PATCH_FIELDS = new Set(["score", "notes"]);
const ORG_LEVEL_ROLES = new Set(["OrgAdmin", "ClubDirector", "ManagerCoach"]);

function normalizeOrgId(orgId) {
  return String(orgId);
}

function allowEvaluationSessionsAccess(req, orgId) {
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

function rejectUnknownFields(obj, allowed) {
  if (!obj || typeof obj !== "object") return null;
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) return key;
  }
  return null;
}

function isUuid(value) {
  if (typeof value !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

router.post("/:orgId/evaluation-sessions/start", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, START_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
  const planId = body.evaluation_plan_id;

  if (!eventId) {
    return badRequest(res, "invalid_event_id");
  }
  if (!isUuid(planId)) {
    return badRequest(res, "invalid_evaluation_plan_id");
  }

  try {
    const item = await startEvaluationSessionForOrg({
      orgId,
      eventId,
      evaluationPlanId: planId,
      createdByUserId: req.user?.id ?? null,
    });
    return res.status(201).json({ item });
  } catch (err) {
    if (err?.code === "event_not_found") {
      return res.status(404).json({ error: "event_not_found" });
    }
    if (err?.code === "evaluation_plan_not_found") {
      return res.status(404).json({ error: "evaluation_plan_not_found" });
    }
    if (err?.code === "event_team_required") {
      return badRequest(res, "event_team_required");
    }
    if (err?.code === "invalid_plan_team") {
      return badRequest(res, "invalid_plan_team");
    }
    if (err?.code === "session_already_exists") {
      return res.status(409).json({ error: "session_already_exists" });
    }
    console.error("[evaluation-sessions.start] failed", err);
    return res.status(500).json({ error: "start_evaluation_session_failed" });
  }
});

router.get("/:orgId/evaluation-sessions", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const items = await listEvaluationSessionsForOrg({ orgId });
    return res.status(200).json({ items });
  } catch (err) {
    console.error("[evaluation-sessions.list] failed", err);
    return res.status(500).json({ error: "list_evaluation_sessions_failed" });
  }
});

router.get("/:orgId/evaluation-sessions/:sessionId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const sessionId = req.params.sessionId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(sessionId)) {
    return badRequest(res, "invalid_session_id");
  }

  const item = await getEvaluationSessionForOrg({ orgId, sessionId });
  if (!item) {
    return res.status(404).json({ error: "evaluation_session_not_found" });
  }
  return res.status(200).json({ item });
});

router.patch("/:orgId/evaluation-sessions/:sessionId/complete", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const sessionId = req.params.sessionId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(sessionId)) {
    return badRequest(res, "invalid_session_id");
  }

  try {
    const item = await completeEvaluationSessionForOrg({ orgId, sessionId });
    if (!item) {
      return res.status(404).json({ error: "evaluation_session_not_found" });
    }
    return res.status(200).json({ item });
  } catch (err) {
    console.error("[evaluation-sessions.complete] failed", err);
    return res.status(500).json({ error: "complete_evaluation_session_failed" });
  }
});

router.post("/:orgId/evaluation-sessions/:sessionId/scores", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const sessionId = req.params.sessionId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(sessionId)) {
    return badRequest(res, "invalid_session_id");
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, SCORE_CREATE_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  const playerId = typeof body.player_id === "string" ? body.player_id.trim() : "";
  const blockId = typeof body.block_id === "string" ? body.block_id.trim() : "";
  if (!playerId) {
    return badRequest(res, "invalid_player_id");
  }
  if (!blockId) {
    return badRequest(res, "invalid_block_id");
  }
  if (typeof body.score !== "object" || body.score === null) {
    return badRequest(res, "invalid_score_payload");
  }

  try {
    const item = await submitPlayerScoreForSession({
      orgId,
      sessionId,
      playerId,
      blockId,
      score: body.score,
      notes: body.notes,
      actorUserId: req.user?.id ?? null,
    });
    return res.status(201).json({ item });
  } catch (err) {
    if (err?.code === "evaluation_session_not_found") {
      return res.status(404).json({ error: "evaluation_session_not_found" });
    }
    if (err?.code === "player_not_found") {
      return res.status(404).json({ error: "player_not_found" });
    }
    if (err?.code === "player_not_on_team") {
      return badRequest(res, "player_not_on_team");
    }
    if (err?.code === "evaluation_block_not_found") {
      return res.status(404).json({ error: "evaluation_block_not_found" });
    }
    if (err?.code === "block_not_in_plan") {
      return badRequest(res, err.message);
    }
    if (err?.code === "bad_request") {
      return badRequest(res, err.message);
    }
    console.error("[evaluation-sessions.scores.create] failed", err);
    return res.status(500).json({ error: "submit_player_score_failed" });
  }
});

router.patch("/:orgId/evaluation-sessions/:sessionId/scores/:scoreId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const sessionId = req.params.sessionId;
  const scoreId = req.params.scoreId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(sessionId) || !isUuid(scoreId)) {
    return badRequest(res, "invalid_identifier");
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, SCORE_PATCH_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }
  if (!Object.keys(body).length) {
    return badRequest(res, "empty_patch");
  }
  if (body.score && (typeof body.score !== "object" || body.score === null)) {
    return badRequest(res, "invalid_score_payload");
  }

  try {
    const item = await updatePlayerScoreForSession({
      orgId,
      sessionId,
      playerEvaluationId: scoreId,
      score: body.score,
      notes: body.notes,
      actorUserId: req.user?.id ?? null,
    });
    return res.status(200).json({ item });
  } catch (err) {
    if (err?.code === "evaluation_session_not_found") {
      return res.status(404).json({ error: "evaluation_session_not_found" });
    }
    if (err?.code === "player_evaluation_not_found") {
      return res.status(404).json({ error: "player_evaluation_not_found" });
    }
    if (err?.code === "evaluation_block_not_found") {
      return res.status(404).json({ error: "evaluation_block_not_found" });
    }
    if (err?.code === "block_not_in_plan") {
      return badRequest(res, err.message);
    }
    if (err?.code === "bad_request") {
      return badRequest(res, err.message);
    }
    console.error("[evaluation-sessions.scores.update] failed", err);
    return res.status(500).json({ error: "update_player_score_failed" });
  }
});

router.get("/:orgId/evaluation-sessions/:sessionId/scores", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const sessionId = req.params.sessionId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(sessionId)) {
    return badRequest(res, "invalid_session_id");
  }

  try {
    const items = await listPlayerScoresForSession({ orgId, sessionId });
    return res.status(200).json({ items });
  } catch (err) {
    if (err?.code === "evaluation_session_not_found") {
      return res.status(404).json({ error: "evaluation_session_not_found" });
    }
    console.error("[evaluation-sessions.scores.list] failed", err);
    return res.status(500).json({ error: "list_player_scores_failed" });
  }
});

router.get("/:orgId/evaluation-sessions/:sessionId/summary", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const sessionId = req.params.sessionId;
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(sessionId)) {
    return badRequest(res, "invalid_session_id");
  }

  try {
    const item = await getSessionSummaryForOrg({ orgId, sessionId });
    return res.status(200).json({ item });
  } catch (err) {
    if (err?.code === "evaluation_session_not_found") {
      return res.status(404).json({ error: "evaluation_session_not_found" });
    }
    console.error("[evaluation-sessions.summary] failed", err);
    return res.status(500).json({ error: "get_session_summary_failed" });
  }
});

router.get("/:orgId/evaluation-sessions/:sessionId/players/:playerId/summary", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const sessionId = req.params.sessionId;
  const playerId = typeof req.params.playerId === "string" ? req.params.playerId.trim() : "";
  if (!allowEvaluationSessionsAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!isUuid(sessionId)) {
    return badRequest(res, "invalid_session_id");
  }
  if (!playerId) {
    return badRequest(res, "invalid_player_id");
  }

  try {
    const item = await getPlayerSessionSummaryForOrg({ orgId, sessionId, playerId });
    return res.status(200).json({ item });
  } catch (err) {
    if (err?.code === "evaluation_session_not_found") {
      return res.status(404).json({ error: "evaluation_session_not_found" });
    }
    if (err?.code === "player_not_found") {
      return res.status(404).json({ error: "player_not_found" });
    }
    if (err?.code === "player_not_on_team") {
      return badRequest(res, "player_not_on_team");
    }
    console.error("[evaluation-sessions.player-summary] failed", err);
    return res.status(500).json({ error: "get_player_session_summary_failed" });
  }
});

export default router;
