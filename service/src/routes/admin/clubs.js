import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { listOrganizations } from "../../repositories/organizationsRepo.js";
import clubProfileRoutes from "./clubProfile.js";
import clubLogosRoutes from "./clubLogos.js";
import adminTeamsRoutes from "./teams.js";
import clubSettingsRoutes from "./clubSettings.js";
import playersRoutes from "./players.js";
import guardiansRoutes from "./guardians.js";
import eventsRoutes from "./events.js";
import evaluationBlocksRoutes from "./evaluationBlocks.js";
import evaluationPlansRoutes from "./evaluationPlans.js";
import evaluationAIRoutes from "./evaluationAI.js";
import evaluationSessionsRoutes from "./evaluationSessions.js";
import seasonsRoutes from "./seasons.js";

const router = Router();

router.get(
  "/",
  requireSession,
  requirePermission("admin.page.clubs.view", () => ({ type: "platform" })),
  async (_req, res) => {
    const clubs = await listOrganizations();
    res.status(200).json({ items: clubs });
  }
);

// /admin/clubs/:orgId profile + logos + teams + settings + players + guardians
router.use("/", clubProfileRoutes);
router.use("/", clubLogosRoutes);
router.use("/", adminTeamsRoutes);
router.use("/", clubSettingsRoutes);
router.use("/", playersRoutes);
router.use("/", guardiansRoutes);
router.use("/", eventsRoutes);
router.use("/", evaluationBlocksRoutes);
router.use("/", evaluationPlansRoutes);
router.use("/", evaluationAIRoutes);
router.use("/", evaluationSessionsRoutes);
router.use("/", seasonsRoutes);

export default router;
