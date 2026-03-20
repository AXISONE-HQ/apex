import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  seedTestOrgAndUsers,
  DB_ENABLED,
  TEST_ORG_ID,
  TEST_USER_UUIDS,
} from "./helpers/dbTestUtils.js";
import { query } from "../src/db/client.js";
import {
  listFees,
  createFee,
  updateFee,
  deleteFee,
  listInvoices,
  createInvoice,
  updateInvoice,
} from "../src/repositories/paymentsRepo.js";

const RUN_ID = Date.now().toString(36);

async function seedPaymentFixtures() {
  await seedTestOrgAndUsers();
  const seasonId = randomUUID();
  const guardianId = randomUUID();
  const playerId = randomUUID();
  const registrationId = randomUUID();
  const now = new Date();

  await query(
    `INSERT INTO seasons (id, org_id, label, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [seasonId, TEST_ORG_ID, `Payments Season ${RUN_ID}`, now]
  );

  await query(
    `INSERT INTO guardians (id, org_id, first_name, last_name, email, created_at, updated_at)
     VALUES ($1, $2, 'Pay', 'Guardian', $3, $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [guardianId, TEST_ORG_ID, `guardian-${RUN_ID}@example.com`, now]
  );

  await query(
    `INSERT INTO players (id, org_id, first_name, last_name, email, status, created_at, updated_at)
     VALUES ($1, $2, 'Pay', 'Player', $3, 'active', $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [playerId, TEST_ORG_ID, `player-${RUN_ID}@example.com`, now]
  );

  await query(
    `INSERT INTO registrations (id, org_id, season_id, player_id, guardian_id, status, submitted_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $6, $6)
     ON CONFLICT (id) DO NOTHING`,
    [registrationId, TEST_ORG_ID, seasonId, playerId, guardianId, now]
  );

  return { seasonId, guardianId, registrationId };
}

async function makeFee(seasonId, overrides = {}) {
  return createFee({
    orgId: TEST_ORG_ID,
    seasonId,
    name: overrides.name || `Registration Fee ${RUN_ID}`,
    amountCents: overrides.amountCents ?? 2500,
    currency: overrides.currency || "cad",
    feeType: overrides.feeType || "registration",
    isRequired: overrides.isRequired ?? true,
  });
}

test("payments repo fee + invoice CRUD (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured");
    return;
  }

  const { seasonId, registrationId } = await seedPaymentFixtures();
  const guardianUserId = TEST_USER_UUIDS.u2;

  const fee = await makeFee(seasonId);
  assert.equal(fee.amount_cents, 2500);
  assert.equal(fee.currency, "cad");

  const listedFees = await listFees({ orgId: TEST_ORG_ID, seasonId, limit: 10, offset: 0 });
  assert.ok(listedFees.some((row) => row.id === fee.id), "created fee should appear in listing");

  const updatedFee = await updateFee({
    orgId: TEST_ORG_ID,
    feeId: fee.id,
    fields: { name: "Updated Fee", amountCents: 3000, isRequired: false },
  });
  assert.equal(updatedFee.name, "Updated Fee");
  assert.equal(updatedFee.amount_cents, 3000);
  assert.equal(updatedFee.is_required, false);

  const invoice = await createInvoice({
    orgId: TEST_ORG_ID,
    registrationId,
    feeId: fee.id,
    guardianUserId,
    amountCents: 3000,
    currency: "cad",
    notes: "Initial invoice",
  });
  assert.equal(invoice.amount_cents, 3000);
  assert.equal(invoice.status, "pending");

  const invoices = await listInvoices({ orgId: TEST_ORG_ID, limit: 10, offset: 0 });
  assert.ok(invoices.some((row) => row.id === invoice.id && row.fee_name === "Updated Fee"));

  const paidInvoice = await updateInvoice({
    orgId: TEST_ORG_ID,
    invoiceId: invoice.id,
    fields: { status: "paid", paidAt: new Date().toISOString(), notes: "Paid" },
  });
  assert.equal(paidInvoice.status, "paid");
  assert.ok(paidInvoice.paid_at, "paid_at should be set when status updates to paid");

  const deleteGuard = await deleteFee({ orgId: TEST_ORG_ID, feeId: fee.id });
  assert.equal(deleteGuard.deleted, false, "fee with invoices should not delete");

  const orphanFee = await makeFee(seasonId, { name: "One-off", amountCents: 5000 });
  const deleteOrphan = await deleteFee({ orgId: TEST_ORG_ID, feeId: orphanFee.id });
  assert.equal(deleteOrphan.deleted, true, "fee without invoices should delete");
});
