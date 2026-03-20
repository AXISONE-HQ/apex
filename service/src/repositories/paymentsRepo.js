import { query } from "../db/client.js";

export async function listFees({ orgId, seasonId = null, limit = 50, offset = 0 }) {
  const params = [orgId];
  let where = "org_id = $1";
  if (seasonId) {
    params.push(seasonId);
    where += ` AND season_id = $${params.length}`;
  }
  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT *
    FROM payment_fees
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const result = await query(sql, params);
  return result.rows;
}

export async function createFee({ orgId, seasonId, name, amountCents, currency = "cad", feeType = "registration", isRequired = false }) {
  const result = await query(
    `INSERT INTO payment_fees (org_id, season_id, name, amount_cents, currency, fee_type, is_required)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [orgId, seasonId, name, amountCents, currency.toLowerCase(), feeType, isRequired]
  );
  return result.rows[0] || null;
}

export async function updateFee({ orgId, feeId, fields }) {
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined) return;
    let column = null;
    switch (key) {
      case "name":
        column = "name";
        break;
      case "amountCents":
        column = "amount_cents";
        break;
      case "currency":
        column = "currency";
        value = value?.toLowerCase();
        break;
      case "feeType":
        column = "fee_type";
        break;
      case "isRequired":
        column = "is_required";
        break;
      default:
        break;
    }
    if (!column) return;
    updates.push(`${column} = $${values.length + 1}`);
    values.push(value);
  });

  if (!updates.length) {
    return null;
  }

  values.push(orgId);
  values.push(feeId);

  const sql = `
    UPDATE payment_fees
    SET ${updates.join(", ")}, updated_at = NOW()
    WHERE org_id = $${values.length - 1} AND id = $${values.length}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

export async function deleteFee({ orgId, feeId }) {
  const usage = await query(
    `SELECT COUNT(*)::INT AS count
     FROM payment_invoices
     WHERE org_id = $1 AND fee_id = $2`,
    [orgId, feeId]
  );
  const count = usage.rows[0]?.count || 0;
  if (count > 0) {
    return { deleted: false, reason: "invoices_exist" };
  }

  const result = await query(
    `DELETE FROM payment_fees WHERE org_id = $1 AND id = $2 RETURNING id`,
    [orgId, feeId]
  );
  return { deleted: Boolean(result.rowCount) };
}

export async function listInvoices({ orgId, registrationId = null, guardianUserId = null, limit = 50, offset = 0 }) {
  const params = [orgId];
  let where = "inv.org_id = $1";
  if (registrationId) {
    params.push(registrationId);
    where += ` AND inv.registration_id = $${params.length}`;
  }
  if (guardianUserId) {
    params.push(guardianUserId);
    where += ` AND inv.guardian_user_id = $${params.length}`;
  }
  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT inv.*, fees.name AS fee_name, fees.fee_type
    FROM payment_invoices inv
    LEFT JOIN payment_fees fees ON fees.id = inv.fee_id
    WHERE ${where}
    ORDER BY inv.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const result = await query(sql, params);
  return result.rows;
}

export async function createInvoice({
  orgId,
  registrationId,
  feeId,
  guardianUserId = null,
  amountCents,
  currency = "cad",
  notes = null,
}) {
  const result = await query(
    `INSERT INTO payment_invoices
       (org_id, registration_id, fee_id, guardian_user_id, amount_cents, currency, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [orgId, registrationId, feeId, guardianUserId, amountCents, currency.toLowerCase(), notes]
  );
  return result.rows[0] || null;
}

export async function updateInvoice({ orgId, invoiceId, fields }) {
  const updates = [];
  const values = [];

  if (fields.status) {
    updates.push(`status = $${values.length + 1}`);
    values.push(fields.status);
    if (fields.status === "paid" && !fields.paidAt) {
      updates.push(`paid_at = NOW()`);
    }
  }

  if (fields.paidAt) {
    updates.push(`paid_at = $${values.length + 1}`);
    values.push(fields.paidAt);
  }

  if (fields.notes !== undefined) {
    updates.push(`notes = $${values.length + 1}`);
    values.push(fields.notes);
  }

  if (fields.stripePaymentIntentId !== undefined) {
    updates.push(`stripe_payment_intent_id = $${values.length + 1}`);
    values.push(fields.stripePaymentIntentId);
  }

  if (fields.stripeCheckoutSessionId !== undefined) {
    updates.push(`stripe_checkout_session_id = $${values.length + 1}`);
    values.push(fields.stripeCheckoutSessionId);
  }

  if (!updates.length) return null;

  values.push(orgId);
  values.push(invoiceId);

  const sql = `
    UPDATE payment_invoices
    SET ${updates.join(", ")}, updated_at = NOW()
    WHERE org_id = $${values.length - 1} AND id = $${values.length}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

export async function getInvoiceById({ orgId, invoiceId }) {
  const result = await query(
    `SELECT inv.*, fees.name AS fee_name, fees.fee_type
     FROM payment_invoices inv
     LEFT JOIN payment_fees fees ON fees.id = inv.fee_id
     WHERE inv.org_id = $1 AND inv.id = $2
     LIMIT 1`,
    [orgId, invoiceId]
  );
  return result.rows[0] || null;
}

export async function getStripeAccountForOrg(orgId) {
  const result = await query(
    `SELECT * FROM payment_club_stripe_accounts WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );
  return result.rows[0] || null;
}
