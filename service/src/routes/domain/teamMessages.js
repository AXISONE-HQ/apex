import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";
import { createTeamMessage, listTeamMessages } from "../../repositories/teamMessagesRepo.js";

const router = Router({ mergeParams: true });

const postLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyFn: (req) => req.user?.id || req.ip || "unknown",
});

router.get(
  "/",
  requireSession,
  requirePermission("team_messages.view", async (req) => ({
    type: "organization",
    id: req.user?.activeOrgId,
  })),
  // team scope is enforced with the events-style teamScopes guard inside the handler
  requirePermission("team_messages.view", async (req) => ({
    type: "team",
    id: req.params.teamId,
  })),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) {
      return res.status(400).json({ error: { code: "bad_request", message: "activeOrgId required" } });
    }

    // Match events semantics: only restrict by teamScopes when teamScopes is non-empty.
    if (req.user?.teamScopes?.length && !req.user.teamScopes.map(String).includes(String(req.params.teamId))) {
      return res.status(403).json({ error: "forbidden", reason: "team_scope_restriction" });
    }

    const limit = req.query?.limit ? Number(req.query.limit) : 50;
    const limitNum = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;

    const messages = await listTeamMessages({ orgId, teamId: req.params.teamId, limit: limitNum });
    return res.status(200).json({ messages });
  }
);

router.post(
  "/",
  requireSession,
  requirePermission("team_messages.create", async (req) => ({
    type: "organization",
    id: req.user?.activeOrgId,
  })),
  // team scope is enforced with the events-style teamScopes guard inside the handler
  requirePermission("team_messages.create", async (req) => ({
    type: "team",
    id: req.params.teamId,
  })),
  postLimiter,
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) {
      return res.status(400).json({ error: { code: "bad_request", message: "activeOrgId required" } });
    }

    // Match events semantics: only restrict by teamScopes when teamScopes is non-empty.
    if (req.user?.teamScopes?.length && !req.user.teamScopes.map(String).includes(String(req.params.teamId))) {
      return res.status(403).json({ error: "forbidden", reason: "team_scope_restriction" });
    }

    const { body } = req.body || {};
    if (!body || typeof body !== "string") {
      return res.status(400).json({ error: { code: "bad_request", message: "body is required" } });
    }

    const message = await createTeamMessage({
      orgId,
      teamId: req.params.teamId,
      userId: req.user?.id || null,
      body,
    });

    return res.status(201).json({ message });
  }
);

export default router;
