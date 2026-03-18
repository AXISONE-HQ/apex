import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { generateEvaluationBlockSuggestions } from "../../services/evaluationAIService.js";

const router = Router({ mergeParams: true });

const REQUEST_FIELDS = new Set([
  "sport",
  "evaluation_category",
  "complexity",
  "age_group",
  "gender",
  "team_level",
]);

const ORG_LEVEL_ROLES = new Set(["OrgAdmin", "ClubDirector", "ManagerCoach"]);

function normalizeOrgId(orgId) {
  return String(orgId);
}

function allowEvaluationAIAccess(req, orgId) {
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

router.post("/:orgId/evaluation-ai/generate", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowEvaluationAIAccess(req, orgId)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const body = req.body || {};
  const unknown = rejectUnknownFields(body, REQUEST_FIELDS);
  if (unknown) {
    return badRequest(res, `unknown_field:${unknown}`);
  }

  try {
    const suggestions = await generateEvaluationBlockSuggestions({ ...body, orgId });
    return res.status(200).json({ suggestions });
  } catch (err) {
    if (err?.code === "bad_request") {
      return badRequest(res, err.message || "bad_request");
    }
    if (err?.code === "no_valid_suggestions") {
      return badRequest(res, err.message);
    }
    console.error("[evaluation-ai.generate] failed", err, err?.meta || null);
    return res.status(500).json({ error: "evaluation_ai_generate_failed" });
  }
});

export default router;
