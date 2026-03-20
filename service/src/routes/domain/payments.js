import express, { Router } from "express";
import logger from "../../lib/logger.js";
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
  getInvoiceById,
  getStripeAccountForOrg,
} from "../../repositories/paymentsRepo.js";
import { createCheckoutSession, constructWebhookEvent } from "../../lib/stripe.js";

const router = Router();

const PAYMENT_MANAGE_PERMISSION = "payments.function.manage";
const PAYMENTS_VIEW_PERMISSION = "payments.page.view";
const PAYMENTS_VIEW_OWN = "payments.page.view_own";
const PAY_PERMISSION = "payments.function.pay";

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

router.get("/invoices/mine", requireSession, requirePermission(PAYMENTS_VIEW_OWN), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  const guardianUserId = req.user?.id;
  if (!orgId || !guardianUserId) return badRequest(res, "active org and guardian user required");
  const { limit, offset } = parsePagination(req.query);
  const items = await listInvoices({ orgId, guardianUserId, limit, offset });
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

router.post("/invoices/:id/checkout", requireSession, requirePermission(PAY_PERMISSION), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  const userId = req.user?.id;
  if (!orgId || !userId) return badRequest(res, "active org and user required");
  const { successUrl, cancelUrl } = req.body || {};
  if (!successUrl || !cancelUrl) return badRequest(res, "successUrl and cancelUrl are required");

  const invoice = await getInvoiceById({ orgId, invoiceId: req.params.id });
  if (!invoice) return notFound(res, "invoice_not_found");
  if (invoice.guardian_user_id && invoice.guardian_user_id !== userId) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (invoice.status === "paid") {
    return badRequest(res, "Invoice already paid");
  }

  const stripeAccount = await getStripeAccountForOrg(orgId);
  if (!stripeAccount) {
    return badRequest(res, "Stripe account not connected for this club");
  }

  const session = await createCheckoutSession({
    orgId,
    invoiceId: invoice.id,
    amountCents: invoice.amount_cents,
    currency: invoice.currency,
    clubStripeAccountId: stripeAccount.stripe_account_id,
    successUrl,
    cancelUrl,
    description: invoice.fee_name || "Club fee",
  });

  await updateInvoice({
    orgId,
    invoiceId: invoice.id,
    fields: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
    },
  });

  res.status(200).json({ sessionUrl: session.url });
});

router.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    let event;
    try {
      event = constructWebhookEvent(req.body, signature);
    } catch (err) {
      logger.error({ err }, "Stripe webhook signature verification failed");
      return res.status(400).json({ error: "invalid_signature" });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const invoiceId = session.metadata?.invoice_id;
          const orgId = session.metadata?.org_id;
          if (invoiceId && orgId) {
            await updateInvoice({
              orgId,
              invoiceId,
              fields: {
                status: "paid",
                paidAt: new Date().toISOString(),
                stripePaymentIntentId: session.payment_intent,
                stripeCheckoutSessionId: session.id,
              },
            });
          } else {
            logger.warn({ sessionId: session.id }, "Stripe session missing invoice/org metadata");
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const intent = event.data.object;
          const invoiceId = intent.metadata?.invoice_id;
          const orgId = intent.metadata?.org_id;
          if (invoiceId && orgId) {
            await updateInvoice({
              orgId,
              invoiceId,
              fields: {
                status: "failed",
                stripePaymentIntentId: intent.id,
              },
            });
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      logger.error({ err, eventType: event.type }, "Failed to process Stripe webhook");
      return res.status(500).json({ error: "webhook_processing_failed" });
    }

    res.status(200).json({ received: true });
  }
);

export default router;
