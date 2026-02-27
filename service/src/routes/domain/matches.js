import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createMatch, listMatchesByOrg, submitMatchResult } from "../../repositories/matchesRepo.js";

const router = Router();

router.get("/", requireSession, requirePermission("matches.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const items = await listMatchesByOrg(orgId);
  res.status(200).json({ items });
});

router.post("/", requireSession, requirePermission("matches.function.create"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { homeTeamId, awayTeamId, startsAt = null } = req.body || {};
  if (!homeTeamId || !awayTeamId) return res.status(400).json({ error: "homeTeamId and awayTeamId required" });

  const match = await createMatch({ orgId, homeTeamId, awayTeamId, startsAt });
  res.status(201).json(match);
});

router.post("/:id/result", requireSession, requirePermission("matches.function.result.submit"), async (req, res) => {
  const { homeScore, awayScore } = req.body || {};
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
    return res.status(400).json({ error: "homeScore and awayScore must be integers" });
  }

  const result = await submitMatchResult({
    matchId: req.params.id,
    homeScore,
    awayScore,
    submittedBy: req.user?.id || null
  });
  res.status(201).json(result);
});

export default router;
