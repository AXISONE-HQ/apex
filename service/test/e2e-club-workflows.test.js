import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { DB_ENABLED, TEST_ORG_ID, TEST_USER_UUIDS, seedTestOrgAndUsers } from "./helpers/dbTestUtils.js";
import { createPlayer } from "../src/repositories/playersRepo.js";
import { createGuardian } from "../src/repositories/guardiansRepo.js";
import { linkGuardianToPlayer } from "../src/repositories/guardianPlayersRepo.js";
import { createFee, createInvoice, getInvoiceById } from "../src/repositories/paymentsRepo.js";
import { ensureStripeAccount } from "./helpers/paymentsFixtures.js";

const RUN_ID = Date.now().toString(36);
let server;
let baseUrl;

function adminUser() {
  return {
    id: TEST_USER_UUIDS.u1,
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    roles: ["OrgAdmin"],
    permissions: [
      "seasons.function.create",
      "seasons.page.view",
      "registrations.page.view",
      "registrations.function.review",
    ],
  };
}

function guardianUser(guardianId) {
  return {
    id: TEST_USER_UUIDS.u2,
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    guardianId,
    roles: ["Guardian"],
    permissions: [
      "registrations.page.view_own",
      "registrations.function.create",
      "registrations.function.withdraw",
      "payments.page.view_own",
      "payments.function.pay",
    ],
  };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

async function request(path, { method = "GET", user, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headersFor(user),
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function ensureServer() {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
}

test.before(async () => {
  await seedTestOrgAndUsers();
  await ensureServer();
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

async function bootstrapGuardianPlayer() {
  const guardian = await createGuardian({
    orgId: TEST_ORG_ID,
    firstName: "E2E",
    lastName: `Guardian-${RUN_ID}`,
    email: `guardian-${RUN_ID}@example.com`,
  });
  const player = await createPlayer({
    orgId: TEST_ORG_ID,
    firstName: "E2E",
    lastName: `Player-${RUN_ID}`,
  });
  await linkGuardianToPlayer({ orgId: TEST_ORG_ID, guardianId: guardian.id, playerId: player.id });
  return { guardianId: guardian.id, playerId: player.id };
}

test("season creation + guardian registration approval", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured for DB-backed e2e test");
    return;
  }

  const admin = adminUser();
  const seasonPayload = {
    label: `E2E Season ${RUN_ID}`,
    year: 2027,
    starts_on: "2027-09-05",
  };
  const createSeasonRes = await request(`/admin/clubs/${TEST_ORG_ID}/seasons`, {
    method: "POST",
    user: admin,
    body: seasonPayload,
  });
  assert.equal(createSeasonRes.status, 201, `season create failed: ${createSeasonRes.status}`);
  const createdSeason = await createSeasonRes.json();
  assert.ok(createdSeason?.item?.id, "season id missing");

  const activateSeasonRes = await request(
    `/admin/clubs/${TEST_ORG_ID}/seasons/${createdSeason.item.id}`,
    {
      method: "PATCH",
      user: admin,
      body: { status: "active" },
    }
  );
  assert.equal(
    activateSeasonRes.status,
    200,
    `season activate failed (${activateSeasonRes.status})`
  );

  const activatedSeason = await activateSeasonRes.json();
  assert.equal(activatedSeason?.item?.status, "active", "season status not active");

  const { guardianId, playerId } = await bootstrapGuardianPlayer();
  const guardian = guardianUser(guardianId);

  const createRegistrationRes = await request(`/registrations`, {
    method: "POST",
    user: guardian,
    body: { playerId, seasonId: createdSeason.item.id },
  });
  assert.equal(createRegistrationRes.status, 201, `registration create failed (${createRegistrationRes.status})`);
  const { registration } = await createRegistrationRes.json();
  assert.equal(registration.status, "pending");

  const approveRes = await request(`/registrations/${registration.id}/status`, {
    method: "PATCH",
    user: admin,
    body: { status: "approved", notes: "E2E happy path" },
  });
  assert.equal(approveRes.status, 200, `status update failed (${approveRes.status})`);
  const approvedBody = await approveRes.json();
  assert.equal(approvedBody.registration.status, "approved");

  const guardianList = await request(`/registrations/mine`, { user: guardian });
  assert.equal(guardianList.status, 200, "guardian listing failed");
  const mine = await guardianList.json();
  assert.ok(mine.items.find((item) => item.id === registration.id));
});

test("payments checkout + invoice reconciliation across the seeded registration", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured for DB-backed e2e test");
    return;
  }

  await ensureStripeAccount();

  const admin = adminUser();
  const seasonPayload = {
    label: `E2E Payments Season ${RUN_ID}`,
    year: 2027,
    starts_on: "2027-10-01",
  };

  const seasonRes = await request(`/admin/clubs/${TEST_ORG_ID}/seasons`, {
    method: "POST",
    user: admin,
    body: seasonPayload,
  });
  assert.equal(seasonRes.status, 201, `payments season create failed (${seasonRes.status})`);
  const createdSeason = await seasonRes.json();
  const seasonId = createdSeason?.item?.id;
  assert.ok(seasonId, "payments season id missing");

  const activateSeasonRes = await request(`/admin/clubs/${TEST_ORG_ID}/seasons/${seasonId}`, {
    method: "PATCH",
    user: admin,
    body: { status: "active" },
  });
  assert.equal(
    activateSeasonRes.status,
    200,
    `payments season activate failed (${activateSeasonRes.status})`
  );

  const { guardianId, playerId } = await bootstrapGuardianPlayer();
  const guardian = guardianUser(guardianId);

  const registrationRes = await request(`/registrations`, {
    method: "POST",
    user: guardian,
    body: { playerId, seasonId },
  });
  assert.equal(registrationRes.status, 201, `registration create failed (${registrationRes.status})`);
  const { registration } = await registrationRes.json();
  assert.ok(registration?.id, "registration id missing for payments scenario");

  const fee = await createFee({
    orgId: TEST_ORG_ID,
    seasonId,
    name: `Registration Fee ${RUN_ID}`,
    amountCents: 7500,
    currency: "cad",
    feeType: "registration",
    isRequired: true,
  });
  assert.ok(fee?.id, "fee creation failed");

  const invoice = await createInvoice({
    orgId: TEST_ORG_ID,
    registrationId: registration.id,
    feeId: fee.id,
    guardianUserId: guardian.id,
    amountCents: 7500,
    currency: "cad",
    notes: "E2E payments flow",
  });
  assert.ok(invoice?.id, "invoice creation failed");

  const guardianInvoicesRes = await request(`/payments/invoices/mine`, { user: guardian });
  assert.equal(guardianInvoicesRes.status, 200, "guardian invoices listing failed");
  const guardianInvoices = await guardianInvoicesRes.json();
  assert.ok(
    guardianInvoices.items.some((item) => item.id === invoice.id),
    "invoice missing from guardian view"
  );

  const originalPayments = app.locals.payments;
  const recorded = {};
  app.locals.payments = {
    createCheckoutSession: async (params) => {
      recorded.params = params;
      return {
        id: "cs_test_e2e",
        url: "https://stripe.test/cs_test_e2e",
        payment_intent: "pi_test_e2e",
      };
    },
  };

  try {
    const checkoutRes = await request(`/payments/invoices/${invoice.id}/checkout`, {
      method: "POST",
      user: guardian,
      body: {
        successUrl: "https://app.example.com/payments/success",
        cancelUrl: "https://app.example.com/payments/cancel",
      },
    });
    assert.equal(checkoutRes.status, 200, `checkout failed (${checkoutRes.status})`);
    const checkoutBody = await checkoutRes.json();
    assert.equal(checkoutBody.sessionUrl, "https://stripe.test/cs_test_e2e");
  } finally {
    app.locals.payments = originalPayments;
  }

  assert.equal(recorded.params?.invoiceId, invoice.id, "invoice id missing from checkout params");
  assert.equal(
    recorded.params?.clubStripeAccountId,
    "acct_test_123",
    "stripe account not passed to checkout"
  );

  const updatedInvoice = await getInvoiceById({ orgId: TEST_ORG_ID, invoiceId: invoice.id });
  assert.equal(updatedInvoice?.stripe_checkout_session_id, "cs_test_e2e");
  assert.equal(updatedInvoice?.stripe_payment_intent_id, "pi_test_e2e");

  const guardianInvoicesAfterRes = await request(`/payments/invoices/mine`, { user: guardian });
  assert.equal(guardianInvoicesAfterRes.status, 200, "guardian invoices post-checkout failed");
  const guardianInvoicesAfter = await guardianInvoicesAfterRes.json();
  const hydratedInvoice = guardianInvoicesAfter.items.find((item) => item.id === invoice.id);
  assert.ok(hydratedInvoice, "invoice missing after checkout");
  assert.equal(hydratedInvoice.stripe_checkout_session_id, "cs_test_e2e");
});

// Upcoming scenarios stitched together in the same e2e harness

test.todo("AI practice plan generation, save, load, and export round-trip");
test.todo("tryout creation, scoring, and roster generation pipeline");
test.todo("dashboard rollups reflect season + payment + tryout signals");
