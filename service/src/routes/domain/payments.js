import express, { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { badRequest, notFound, parsePagination } from "./_helpers.js";
import {
  listFees,
  createFee,
  updateFee,
  deleteFee,
  listInvoices,
  createInvoice,
  updateInvoice,
} from "../../repositories/paymentsRepo.js";

const router = Router();

const PAYMENT_MANAGE_PERMISSION = "payments.function.manage";
const PAYMENTS_VIEW_PERMISSION = "payments.page.view";

router.get("/fees", requireSession, requirePermission(PAYMENTS_VIEW_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const { limit, offset } = parsePagination(req.query);
  const seasonId = req.query?.season_id ? String(req.query.season_id) : null;
  const items = await listFees({ orgId, seasonId, limit, offset });
  res.status(200).json({ items, paging: { limit, offset } });
});

router.post("/fees", requireSession, requirePermission(PAYMENT_MANAGE_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const { seasonId, name, amountCents, currency = "cad", feeType = "registration", isRequired = false } = req.body || {};

  if (!seasonId) return badRequest(res, "seasonId is required");
  if (!name || typeof name !== "string" || !name.trim()) return badRequest(res, "name is required");
  if (!Number.isInteger(amountCents) || amountCents <= 0) return badRequest(res, "amountCents must be a positive integer");

  const fee = await createFee({
    orgId,
    seasonId,
    name: name.trim(),
    amountCents,
    currency,
    feeType,
    isRequired: Boolean(isRequired),
  });
  res.status(201).json({ fee });
});

router.patch("/fees/:id", requireSession, requirePermission(PAYMENT_MANAGE_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const fields = {
    name: req.body?.name,
    amountCents: req.body?.amountCents,
    currency: req.body?.currency,
    feeType: req.body?.feeType,
    isRequired: req.body?.isRequired,
  };

  if (fields.amountCents !== undefined && (!Number.isInteger(fields.amountCents) || fields.amountCents <= 0)) {
    return badRequest(res, "amountCents must be a positive integer");
  }

  const updated = await updateFee({ orgId, feeId: req.params.id, fields });
  if (!updated) return notFound(res, "fee_not_found");
  res.status(200).json({ fee: updated });
});

router.delete("/fees/:id", requireSession, requirePermission(PAYMENT_MANAGE_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const result = await deleteFee({ orgId, feeId: req.params.id });
  if (!result.deleted) {
    return res.status(409).json({ error: "fee_has_invoices" });
  }
  res.status(204).send();
});

router.get("/invoices", requireSession, requirePermission(PAYMENTS_VIEW_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const { limit, offset } = parsePagination(req.query);
  const registrationId = req.query?.registration_id ? String(req.query.registration_id) : null;
  const items = await listInvoices({ orgId, registrationId, limit, offset });
  res.status(200).json({ items, paging: { limit, offset } });
});

router.post("/invoices", requireSession, requirePermission(PAYMENT_MANAGE_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const invoices = Array.isArray(req.body?.invoices) ? req.body.invoices : [];
  if (!invoices.length) return badRequest(res, "invoices array is required");

  const created = [];
  for (const payload of invoices) {
    const {
      registrationId,
      feeId,
      guardianUserId = null,
      amountCents,
      currency = "cad",
      notes = null,
    } = payload || {};

    if (!registrationId || !feeId) {
      return badRequest(res, "registrationId and feeId are required for each invoice");
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return badRequest(res, "amountCents must be a positive integer for each invoice");
    }

    const invoice = await createInvoice({
      orgId,
      registrationId,
      feeId,
      guardianUserId,
      amountCents,
      currency,
      notes,
    });
    created.push(invoice);
  }

  res.status(201).json({ invoices: created });
});

router.patch("/invoices/:id", requireSession, requirePermission(PAYMENT_MANAGE_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");
  const { status, notes, paidAt, stripePaymentIntentId, stripeCheckoutSessionId } = req.body || {};
  if (!status && notes === undefined && !paidAt && stripePaymentIntentId === undefined && stripeCheckoutSessionId === undefined) {
    return badRequest(res, "No fields provided");
  }

  const updated = await updateInvoice({
    orgId,
    invoiceId: req.params.id,
    fields: { status, notes, paidAt, stripePaymentIntentId, stripeCheckoutSessionId },
  });

  if (!updated) return notFound(res, "invoice_not_found");
  res.status(200).json({ invoice: updated });
});

router.post("/invoices/:id/checkout", requireSession, requirePermission("payments.function.pay"), async (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});

router.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (_req, res) => {
    res.status(501).json({ error: "not_implemented" });
  }
);

export default router;
