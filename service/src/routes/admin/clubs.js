import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { listOrganizations } from "../../repositories/organizationsRepo.js";
import clubsCreateRoutes from "./clubsCreate.js";

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

router.use(clubsCreateRoutes);

export default router;
