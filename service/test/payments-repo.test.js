import test from "node:test";
import assert from "node:assert/strict";

import { DB_ENABLED, TEST_ORG_ID, TEST_USER_UUIDS } from "./helpers/dbTestUtils.js";
import { seedPaymentFixtures } from "./helpers/paymentsFixtures.js";
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
