import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { badRequest, notFound, parsePagination } from "./_helpers.js";
import {
  addPracticePlanBlockForOrg,
  createPracticePlanForOrg,
  deletePracticePlanBlockForOrg,
  deletePracticePlanForOrg,
  getPracticePlanBlockForOrg,
  getPracticePlanForOrg,
  listPracticePlanBlocksForOrg,
  listPracticePlansForOrg,
  reorderPracticePlanBlocksForOrg,
  setPracticePlanStatusForOrg,
  updatePracticePlanBlockForOrg,
  updatePracticePlanForOrg,
} from "../../services/practicePlansService.js";

const router = Router();

function handleError(err, res) {
  if (err.code === "validation_error") {
    return badRequest(res, err.message, err.details);
  }
  if (err.code === "not_found") {
    return notFound(res, err.message || "practice_plan_not_found");
  }
  throw err;
}

router.get("/", requireSession, requirePermission("practice.plans.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const { limit, offset } = parsePagination(req.query);
  const filters = {
    teamId: req.query?.teamId,
    status: req.query?.status,
    coachUserId: req.query?.coachUserId,
    fromDate: req.query?.fromDate,
    toDate: req.query?.toDate,
    search: req.query?.search,
  };

  try {
    const items = await listPracticePlansForOrg({ orgId, filters, limit, offset });
    return res.status(200).json({ items, paging: { limit, offset } });
  } catch (err) {
    return handleError(err, res);
  }
});

router.get(
  "/:id",
  requireSession,
  requirePermission("practice.plans.page.view"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      const plan = await getPracticePlanForOrg({ orgId, planId: req.params.id });
      if (!plan) return notFound(res, "practice_plan_not_found");
      return res.status(200).json({ plan });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.post(
  "/",
  requireSession,
  requirePermission("practice.plans.function.create"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      const plan = await createPracticePlanForOrg({
        orgId,
        userId: req.user?.id || null,
        payload: req.body || {},
      });
      return res.status(201).json({ plan });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.patch(
  "/:id",
  requireSession,
  requirePermission("practice.plans.function.update"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      const plan = await updatePracticePlanForOrg({
        orgId,
        planId: req.params.id,
        payload: req.body || {},
      });
      return res.status(200).json({ plan });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.patch(
  "/:id/status",
  requireSession,
  requirePermission("practice.plans.function.publish"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    try {
      const plan = await setPracticePlanStatusForOrg({
        orgId,
        planId: req.params.id,
        status: req.body?.status,
      });
      return res.status(200).json({ plan });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.delete(
  "/:id",
  requireSession,
  requirePermission("practice.plans.function.delete"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      await deletePracticePlanForOrg({ orgId, planId: req.params.id });
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.get(
  "/:id/blocks",
  requireSession,
  requirePermission("practice.plans.page.view"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      const items = await listPracticePlanBlocksForOrg({ orgId, planId: req.params.id });
      return res.status(200).json({ items });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.post(
  "/:id/blocks",
  requireSession,
  requirePermission("practice.plans.function.update"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      const block = await addPracticePlanBlockForOrg({
        orgId,
        planId: req.params.id,
        payload: req.body || {},
      });
      return res.status(201).json({ block });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.patch(
  "/:id/blocks/:blockId",
  requireSession,
  requirePermission("practice.plans.function.update"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      const block = await updatePracticePlanBlockForOrg({
        orgId,
        planId: req.params.id,
        blockId: req.params.blockId,
        payload: req.body || {},
      });
      return res.status(200).json({ block });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.delete(
  "/:id/blocks/:blockId",
  requireSession,
  requirePermission("practice.plans.function.update"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      await deletePracticePlanBlockForOrg({
        orgId,
        planId: req.params.id,
        blockId: req.params.blockId,
      });
      return res.status(204).send();
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.post(
  "/:id/blocks/reorder",
  requireSession,
  requirePermission("practice.plans.function.update"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : null;
    try {
      const items = await reorderPracticePlanBlocksForOrg({
        orgId,
        planId: req.params.id,
        orderedIds,
      });
      return res.status(200).json({ items });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

router.get(
  "/:id/blocks/:blockId",
  requireSession,
  requirePermission("practice.plans.page.view"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    try {
      const block = await getPracticePlanBlockForOrg({
        orgId,
        planId: req.params.id,
        blockId: req.params.blockId,
      });
      return res.status(200).json({ block });
    } catch (err) {
      return handleError(err, res);
    }
  }
);

export default router;
