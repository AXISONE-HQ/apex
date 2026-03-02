import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createOrganization, listOrganizations } from "../../repositories/organizationsRepo.js";

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

router.post(
  "/onboarding",
  requireSession,
  requirePermission("admin.clubs.create", () => ({ type: "platform" })),
  async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const slug = String(req.body?.slug || "").trim();
    const country = String(req.body?.country || "").trim();
    const state_province = req.body?.state_province ? String(req.body.state_province).trim() : null;

    if (!name) return res.status(400).json({ error: { code: "bad_request", message: "name is required" } });
    if (!slug) return res.status(400).json({ error: { code: "bad_request", message: "slug is required" } });
    if (!country) return res.status(400).json({ error: { code: "bad_request", message: "country is required" } });

    try {
      const org = await createOrganization({ name, slug, country, state_province });
      return res.status(201).json(org);
    } catch (err) {
      if (err?.code === "org_slug_taken") {
        return res.status(409).json({ error: { code: "conflict", reason: "org_slug_taken" } });
      }
      throw err;
    }
  }
);

export default router;
