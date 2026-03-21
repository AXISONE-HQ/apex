import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { badRequest, notFound, parsePagination } from "./_helpers.js";
import {
  createPracticeDrillForOrg,
  deletePracticeDrillForOrg,
  getPracticeDrillForOrg,
  listPracticeDrillsForOrg,
  updatePracticeDrillForOrg,
} from "../../services/practiceDrillsService.js";

const router = Router();

router.get("/", requireSession, requirePermission("practice.drills.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");

  const { limit, offset } = parsePagination(req.query);
  const filters = {
    category: req.query?.category,
    focusArea: req.query?.focusArea,
    createdBy: req.query?.createdBy,
    search: req.query?.search,
  };

  try {
    const items = await listPracticeDrillsForOrg({ orgId, filters, limit, offset });
    return res.status(200).json({ items, paging: { limit, offset } });
  } catch (err) {
    if (err.code === "validation_error") {
      return badRequest(res, err.message, err.details);
    }
    throw err;
  }
});

router.get(
  "/:id",
  requireSession,
  requirePermission("practice.drills.page.view"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    try {
      const drill = await getPracticeDrillForOrg({ orgId, drillId: req.params.id });
      if (!drill) return notFound(res, "practice_drill_not_found");
      return res.status(200).json({ drill });
    } catch (err) {
      if (err.code === "validation_error") {
        return badRequest(res, err.message, err.details);
      }
      throw err;
    }
  }
);

router.post(
  "/",
  requireSession,
  requirePermission("practice.drills.function.create"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    try {
      const drill = await createPracticeDrillForOrg({
        orgId,
        userId: req.user?.id || null,
        payload: req.body || {},
      });
      return res.status(201).json({ drill });
    } catch (err) {
      if (err.code === "validation_error") {
        return badRequest(res, err.message, err.details);
      }
      throw err;
    }
  }
);

router.patch(
  "/:id",
  requireSession,
  requirePermission("practice.drills.function.update"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    try {
      const drill = await updatePracticeDrillForOrg({
        orgId,
        drillId: req.params.id,
        payload: req.body || {},
      });
      if (!drill) return notFound(res, "practice_drill_not_found");
      return res.status(200).json({ drill });
    } catch (err) {
      if (err.code === "validation_error") {
        return badRequest(res, err.message, err.details);
      }
      throw err;
    }
  }
);

router.delete(
  "/:id",
  requireSession,
  requirePermission("practice.drills.function.delete"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    try {
      const deleted = await deletePracticeDrillForOrg({ orgId, drillId: req.params.id });
      if (!deleted) return notFound(res, "practice_drill_not_found");
      return res.status(204).send();
    } catch (err) {
      if (err.code === "validation_error") {
        return badRequest(res, err.message, err.details);
      }
      throw err;
    }
  }
);

export default router;
