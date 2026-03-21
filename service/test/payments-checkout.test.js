import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { DB_ENABLED, TEST_ORG_ID, TEST_USER_UUIDS } from "./helpers/dbTestUtils.js";
import { seedPaymentFixtures, ensureStripeAccount } from "./helpers/paymentsFixtures.js";
import { createFee, createInvoice, getInvoiceById } from "../src/repositories/paymentsRepo.js";

function makeGuardianUser(id) {
  return {
    id,
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    permissions: ["payments.function.pay"],
    roles: ["Viewer"],
  };
}

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return { server, baseUrl };
}

test("POST /payments/invoices/:id/checkout uses injected Stripe session (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured");
    return;
  }

  const { seasonId, registrationId } = await seedPaymentFixtures();
  await ensureStripeAccount();

  const guardianId = TEST_USER_UUIDS.u2;
  const foreignGuardianId = TEST_USER_UUIDS.u3;

  const fee = await createFee({
    orgId: TEST_ORG_ID,
    seasonId,
    name: "Checkout Fee",
    amountCents: 5000,
    currency: "cad",
    feeType: "registration",
    isRequired: true,
  });

  const invoice = await createInvoice({
    orgId: TEST_ORG_ID,
    registrationId,
    feeId: fee.id,
    guardianUserId: guardianId,
    amountCents: 5000,
    currency: "cad",
    notes: "Checkout test",
  });

  const { server, baseUrl } = await startServer();
  const originalPayments = app.locals.payments;
  const recorded = {};
  app.locals.payments = {
    createCheckoutSession: async (params) => {
      recorded.params = params;
      return { id: "cs_test_123", url: "https://stripe.test/cs_test_123", payment_intent: "pi_test_123" };
    },
  };

  try {
    const guardianResponse = await fetch(`${baseUrl}/payments/invoices/${invoice.id}/checkout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(makeGuardianUser(guardianId)),
      },
      body: JSON.stringify({ successUrl: "https://app.test/success", cancelUrl: "https://app.test/cancel" }),
    });

    assert.equal(guardianResponse.status, 200);
    const body = await guardianResponse.json();
    assert.equal(body.sessionUrl, "https://stripe.test/cs_test_123");
    assert.equal(recorded.params.orgId, TEST_ORG_ID);
    assert.equal(recorded.params.invoiceId, invoice.id);
    assert.equal(recorded.params.amountCents, 5000);

    const updated = await getInvoiceById({ orgId: TEST_ORG_ID, invoiceId: invoice.id });
    assert.equal(updated.stripe_checkout_session_id, "cs_test_123");
    assert.equal(updated.stripe_payment_intent_id, "pi_test_123");

    const forbidden = await fetch(`${baseUrl}/payments/invoices/${invoice.id}/checkout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(makeGuardianUser(foreignGuardianId)),
      },
      body: JSON.stringify({ successUrl: "https://app.test/success", cancelUrl: "https://app.test/cancel" }),
    });

    assert.equal(forbidden.status, 403);
  } finally {
    app.locals.payments = originalPayments;
    await new Promise((resolve) => server.close(resolve));
  }
});
