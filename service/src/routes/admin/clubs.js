import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { listOrganizations } from "../../repositories/organizationsRepo.js";
import clubProfileRoutes from "./clubProfile.js";
import clubLogosRoutes from "./clubLogos.js";
import adminTeamsRoutes from "./teams.js";
import clubSettingsRoutes from "./clubSettings.js";

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

// /admin/clubs/:orgId profile + logos + teams + settings
router.use("/", clubProfileRoutes);
router.use("/", clubLogosRoutes);
router.use("/", adminTeamsRoutes);
router.use("/", clubSettingsRoutes);

export default router;
