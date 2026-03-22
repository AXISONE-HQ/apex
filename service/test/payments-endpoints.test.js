import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { DB_ENABLED, TEST_ORG_ID, TEST_USER_UUIDS } from "./helpers/dbTestUtils.js";
import { seedPaymentFixtures } from "./helpers/paymentsFixtures.js";
import { createFee, createInvoice, getInvoiceById } from "../src/repositories/paymentsRepo.js";

function makeAdminUser() {
  return {
    id: TEST_USER_UUIDS.u1,
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    permissions: [
      "payments.function.manage",
      "payments.page.view",
      "payments.page.view_own",
      "payments.function.pay",
    ],
    roles: ["Admin"],
  };
}

function makeGuardianUser() {
  return {
    id: TEST_USER_UUIDS.u2,
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    permissions: ["payments.page.view_own", "payments.function.pay"],
    roles: ["Guardian"],
  };
}

async function startServer() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return { server, baseUrl };
}

function jsonHeaders(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

test("payments fees endpoints cover list/create/update/delete (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured");
    return;
  }

  const { seasonId } = await seedPaymentFixtures();
  const adminHeaders = jsonHeaders(makeAdminUser());
  const { server, baseUrl } = await startServer();

  try {
    const emptyRes = await fetch(`${baseUrl}/payments/fees`, {
      headers: adminHeaders,
    });
    assert.equal(emptyRes.status, 200);
    const emptyBody = await emptyRes.json();
    assert.ok(Array.isArray(emptyBody.items));

    const createRes = await fetch(`${baseUrl}/payments/fees`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        seasonId,
        name: "Test Registration Fee",
        amountCents: 4500,
        currency: "CAD",
        feeType: "registration",
        isRequired: true,
      }),
    });
    assert.equal(createRes.status, 201);
    const { fee } = await createRes.json();
    assert.equal(fee.name, "Test Registration Fee");
    assert.equal(fee.amount_cents, 4500);

    const listRes = await fetch(`${baseUrl}/payments/fees?season_id=${seasonId}`, {
      headers: adminHeaders,
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(listBody.items.some((row) => row.id === fee.id));

    const patchRes = await fetch(`${baseUrl}/payments/fees/${fee.id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ name: "Updated Fee", amountCents: 5200, isRequired: false }),
    });
    assert.equal(patchRes.status, 200);
    const patched = await patchRes.json();
    assert.equal(patched.fee.name, "Updated Fee");
    assert.equal(patched.fee.amount_cents, 5200);
    assert.equal(patched.fee.is_required, false);

    const deleteRes = await fetch(`${baseUrl}/payments/fees/${fee.id}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    assert.equal(deleteRes.status, 204);

    const orphanFee = await createFee({
      orgId: TEST_ORG_ID,
      seasonId,
      name: "Guarded Fee",
      amountCents: 3100,
      currency: "cad",
      feeType: "registration",
      isRequired: true,
    });

    const { registrationId } = await seedPaymentFixtures();
    await createInvoice({
      orgId: TEST_ORG_ID,
      registrationId,
      feeId: orphanFee.id,
      guardianUserId: TEST_USER_UUIDS.u2,
      amountCents: 3100,
      currency: "cad",
    });

    const guardDelete = await fetch(`${baseUrl}/payments/fees/${orphanFee.id}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    assert.equal(guardDelete.status, 409, "fee linked to invoices should not delete");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});


test("payments invoice endpoints cover listing, guardian view, bulk create, patch (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured");
    return;
  }

  const firstSeed = await seedPaymentFixtures();
  const secondSeed = await seedPaymentFixtures();
  const seasonId = firstSeed.seasonId;
  const { registrationId } = firstSeed;
  const { registrationId: secondRegistrationId } = secondSeed;
  const adminHeaders = jsonHeaders(makeAdminUser());
  const guardianHeaders = jsonHeaders(makeGuardianUser());
  const { server, baseUrl } = await startServer();

  try {
    const fee = await createFee({
      orgId: TEST_ORG_ID,
      seasonId,
      name: "Invoice Fee",
      amountCents: 2000,
      currency: "cad",
      feeType: "registration",
      isRequired: true,
    });

    const secondFee = await createFee({
      orgId: TEST_ORG_ID,
      seasonId,
      name: "Invoice Fee Two",
      amountCents: 2500,
      currency: "cad",
      feeType: "registration",
      isRequired: false,
    });

    const bulkRes = await fetch(`${baseUrl}/payments/invoices`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        invoices: [
          {
            registrationId,
            feeId: fee.id,
            guardianUserId: TEST_USER_UUIDS.u2,
            amountCents: 2000,
            currency: "CAD",
            notes: "First invoice",
          },
          {
            registrationId: secondRegistrationId,
            feeId: secondFee.id,
            guardianUserId: TEST_USER_UUIDS.u2,
            amountCents: 2500,
            currency: "CAD",
            notes: "Second invoice",
          },
        ],
      }),
    });
    assert.equal(bulkRes.status, 201);
    const bulkBody = await bulkRes.json();
    assert.equal(bulkBody.invoices.length, 2);

    const adminList = await fetch(`${baseUrl}/payments/invoices`, {
      headers: adminHeaders,
    });
    assert.equal(adminList.status, 200);
    const adminBody = await adminList.json();
    assert.ok(adminBody.items.length >= 2, "admin should see invoices");

    const guardianList = await fetch(`${baseUrl}/payments/invoices/mine`, {
      headers: guardianHeaders,
    });
    assert.equal(guardianList.status, 200);
    const guardianBody = await guardianList.json();
    assert.ok(guardianBody.items.length >= 1, "guardian should see own invoices");

    const invoiceId = guardianBody.items[0].id;
    const patchRes = await fetch(`${baseUrl}/payments/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "paid", notes: "Settled via admin", stripePaymentIntentId: "pi_test", stripeCheckoutSessionId: "cs_test" }),
    });
    assert.equal(patchRes.status, 200);
    const updatedBody = await patchRes.json();
    assert.equal(updatedBody.invoice.status, "paid");
    assert.equal(updatedBody.invoice.notes, "Settled via admin");
    assert.equal(updatedBody.invoice.stripe_payment_intent_id, "pi_test");

    const invalidPatch = await fetch(`${baseUrl}/payments/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(invalidPatch.status, 400);

    const refreshed = await getInvoiceById({ orgId: TEST_ORG_ID, invoiceId });
    assert.equal(refreshed.status, "paid");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
