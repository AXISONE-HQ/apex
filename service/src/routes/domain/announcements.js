import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createAnnouncement, listAnnouncements } from "../../repositories/announcementsRepo.js";
import { createRateLimiter } from "../../middleware/rateLimit.js";

const router = Router();

const postLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyFn: (req) => req.user?.id || req.ip || "unknown",
});

router.get(
  "/",
  requireSession,
  requirePermission("announcements.view"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return res.status(400).json({ error: { code: "bad_request", message: "activeOrgId required" } });

    const limit = req.query?.limit ? Number(req.query.limit) : 50;
    const limitNum = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;

    const announcements = await listAnnouncements({ orgId, limit: limitNum });
    return res.status(200).json({ announcements });
  }
);

router.post(
  "/",
  requireSession,
  requirePermission("announcements.create"),
  postLimiter,
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return res.status(400).json({ error: { code: "bad_request", message: "activeOrgId required" } });

    const { title, body } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ error: { code: "bad_request", message: "title and body are required" } });
    }

    const announcement = await createAnnouncement({
      orgId,
      title,
      body,
      createdBy: req.user?.id || null,
    });

    return res.status(201).json({ announcement });
  }
);

export default router;
