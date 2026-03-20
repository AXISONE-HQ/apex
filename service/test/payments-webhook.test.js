import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { DB_ENABLED, TEST_ORG_ID, TEST_USER_UUIDS } from "./helpers/dbTestUtils.js";
import { seedPaymentFixtures } from "./helpers/paymentsFixtures.js";
import { createFee, createInvoice, getInvoiceById } from "../src/repositories/paymentsRepo.js";

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return { server, baseUrl };
}

test("Stripe webhook handler updates invoice statuses (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured");
    return;
  }

  const { seasonId, registrationId } = await seedPaymentFixtures();
  const guardianUserId = TEST_USER_UUIDS.u2;

  const feePaid = await createFee({
    orgId: TEST_ORG_ID,
    seasonId,
    name: "Webhook Fee Paid",
    amountCents: 4200,
    currency: "cad",
    feeType: "registration",
    isRequired: true,
  });

  const feeFailed = await createFee({
    orgId: TEST_ORG_ID,
    seasonId,
    name: "Webhook Fee Failed",
    amountCents: 4200,
    currency: "cad",
    feeType: "registration",
    isRequired: true,
  });

  const invoicePaid = await createInvoice({
    orgId: TEST_ORG_ID,
    registrationId,
    feeId: feePaid.id,
    guardianUserId,
    amountCents: 4200,
    currency: "cad",
  });

  const invoiceFailed = await createInvoice({
    orgId: TEST_ORG_ID,
    registrationId,
    feeId: feeFailed.id,
    guardianUserId,
    amountCents: 4200,
    currency: "cad",
    notes: "Failure case",
  });

  const { server, baseUrl } = await startServer();
  const originalPayments = app.locals.payments;
  const eventState = { next: null };
  app.locals.payments = {
    constructWebhookEvent: () => {
      if (!eventState.next) throw new Error("No mock event set");
      return eventState.next;
    },
  };

  async function postWebhook(event) {
    eventState.next = event;
    const response = await fetch(`${baseUrl}/payments/webhooks/stripe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "test_signature",
      },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 200);
    eventState.next = null;
  }

  try {
    await postWebhook({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_paid",
          payment_intent: "pi_test_paid",
          metadata: { invoice_id: invoicePaid.id, org_id: TEST_ORG_ID },
        },
      },
    });

    const paid = await getInvoiceById({ orgId: TEST_ORG_ID, invoiceId: invoicePaid.id });
    assert.equal(paid.status, "paid");
    assert.equal(paid.stripe_payment_intent_id, "pi_test_paid");
    assert.equal(paid.stripe_checkout_session_id, "cs_test_paid");
    assert.ok(paid.paid_at, "paid_at should be populated after checkout complete");

    await postWebhook({
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_test_failed",
          metadata: { invoice_id: invoiceFailed.id, org_id: TEST_ORG_ID },
        },
      },
    });

    const failed = await getInvoiceById({ orgId: TEST_ORG_ID, invoiceId: invoiceFailed.id });
    assert.equal(failed.status, "failed");
    assert.equal(failed.stripe_payment_intent_id, "pi_test_failed");
  } finally {
    app.locals.payments = originalPayments;
    await new Promise((resolve) => server.close(resolve));
  }
});
