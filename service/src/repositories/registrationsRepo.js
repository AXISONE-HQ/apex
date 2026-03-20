import { hasDatabase, query } from "../db/client.js";

const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected", "waitlisted", "withdrawn"]);
const WITHDRAWABLE_STATUSES = new Set(["pending", "waitlisted"]);

const memoryRegistrations = new Map();
let memorySeq = 1;

function makeMemoryId() {
  return `registration_${memorySeq++}`;
}

function normalizeStatus(status) {
  if (!status) throw new Error("status_required");
  const value = String(status).toLowerCase();
  if (!ALLOWED_STATUSES.has(value)) {
    throw new Error("invalid_status");
  }
  return value;
}

function serializeRow(row) {
  if (!row) return null;
  return { ...row };
}

export async function createRegistration({ orgId, seasonId, playerId, guardianId }) {
  if (!orgId || !seasonId || !playerId || !guardianId) {
    throw new Error("orgId, seasonId, playerId, and guardianId are required");
  }

  if (!hasDatabase()) {
    for (const existing of memoryRegistrations.values()) {
      if (
        String(existing.org_id) === String(orgId) &&
        String(existing.season_id) === String(seasonId) &&
        String(existing.player_id) === String(playerId)
      ) {
        const err = new Error("duplicate_registration");
        err.code = "23505";
        throw err;
      }
    }
    const id = makeMemoryId();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      season_id: String(seasonId),
      player_id: String(playerId),
      guardian_id: String(guardianId),
      status: "pending",
      submitted_at: now,
      reviewed_at: null,
      reviewed_by: null,
      notes: null,
      waitlist_position: null,
      created_at: now,
      updated_at: now,
    };
    memoryRegistrations.set(id, row);
    return serializeRow(row);
  }

  const result = await query(
    `INSERT INTO registrations (org_id, season_id, player_id, guardian_id)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [orgId, seasonId, playerId, guardianId]
  );
  return serializeRow(result.rows[0] || null);
}

export async function listRegistrationsBySeason(orgId, seasonId, { status = null, limit = 50, offset = 0 } = {}) {
  if (!orgId || !seasonId) throw new Error("orgId and seasonId are required");

  if (!hasDatabase()) {
    let items = Array.from(memoryRegistrations.values()).filter(
      (row) => String(row.org_id) === String(orgId) && String(row.season_id) === String(seasonId)
    );
    if (status) {
      const normalized = normalizeStatus(status);
      items = items.filter((row) => row.status === normalized);
    }
    items.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    const start = Number(offset) || 0;
    const end = start + (Number(limit) || 50);
    return items.slice(start, end).map(serializeRow);
  }

  const params = [orgId, seasonId];
  let where = "org_id = $1 AND season_id = $2";
  if (status) {
    params.push(normalizeStatus(status));
    where += ` AND status = $${params.length}`;
  }
  params.push(Number(limit) || 50);
  params.push(Number(offset) || 0);

  const result = await query(
    `SELECT * FROM registrations
     WHERE ${where}
     ORDER BY submitted_at DESC
     LIMIT $${params.length - 1}
     OFFSET $${params.length}`,
    params
  );
  return result.rows.map(serializeRow);
}

export async function listRegistrationsByGuardian(orgId, guardianId, { limit = 50, offset = 0 } = {}) {
  if (!orgId || !guardianId) throw new Error("orgId and guardianId are required");

  if (!hasDatabase()) {
    let items = Array.from(memoryRegistrations.values()).filter(
      (row) => String(row.org_id) === String(orgId) && String(row.guardian_id) === String(guardianId)
    );
    items.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    const start = Number(offset) || 0;
    const end = start + (Number(limit) || 50);
    return items.slice(start, end).map(serializeRow);
  }

  const result = await query(
    `SELECT * FROM registrations
     WHERE org_id = $1 AND guardian_id = $2
     ORDER BY submitted_at DESC
     LIMIT $3 OFFSET $4`,
    [orgId, guardianId, Number(limit) || 50, Number(offset) || 0]
  );
  return result.rows.map(serializeRow);
}

export async function getRegistration(orgId, registrationId) {
  if (!orgId || !registrationId) return null;

  if (!hasDatabase()) {
    const row = memoryRegistrations.get(registrationId);
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return serializeRow(row);
  }

  const result = await query(
    `SELECT * FROM registrations WHERE org_id = $1 AND id = $2 LIMIT 1`,
    [orgId, registrationId]
  );
  return serializeRow(result.rows[0] || null);
}

export async function updateRegistrationStatus(
  orgId,
  registrationId,
  { status, reviewedBy = null, notes = null, waitlistPosition = null } = {}
) {
  if (!orgId || !registrationId) throw new Error("orgId and registrationId are required");
  const normalized = normalizeStatus(status);
  const existing = await getRegistration(orgId, registrationId);
  if (!existing) return null;

  if (!hasDatabase()) {
    const row = memoryRegistrations.get(registrationId);
    if (!row) return null;
    row.status = normalized;
    row.reviewed_by = reviewedBy ? String(reviewedBy) : row.reviewed_by;
    row.reviewed_at = new Date().toISOString();
    if (notes !== null && notes !== undefined) {
      row.notes = notes;
    }
    row.updated_at = new Date().toISOString();
    if (normalized === "waitlisted") {
      row.waitlist_position = waitlistPosition ?? (await memoryNextWaitlistPosition(orgId, row.season_id));
    } else {
      row.waitlist_position = null;
    }
    memoryRegistrations.set(registrationId, row);
    await memoryReorderWaitlist(orgId, row.season_id);
    return serializeRow(row);
  }

  let computedWaitlistPosition = null;
  if (normalized === "waitlisted") {
    computedWaitlistPosition =
      waitlistPosition ?? (await getNextWaitlistPosition(orgId, existing.season_id));
  }

  const result = await query(
    `UPDATE registrations
     SET status = $3,
         reviewed_at = NOW(),
         reviewed_by = $4,
         notes = COALESCE($5, notes),
         waitlist_position = $6,
         updated_at = NOW()
     WHERE org_id = $1 AND id = $2
     RETURNING *`,
    [orgId, registrationId, normalized, reviewedBy, notes, computedWaitlistPosition]
  );
  const updated = result.rows[0] || null;
  if (updated && (normalized === "waitlisted" || existing.status === "waitlisted")) {
    await reorderWaitlist(orgId, existing.season_id);
  }
  return serializeRow(updated);
}

export async function withdrawRegistration(orgId, registrationId, guardianId) {
  const registration = await getRegistration(orgId, registrationId);
  if (!registration) return null;
  if (String(registration.guardian_id) !== String(guardianId)) {
    const err = new Error("forbidden");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (!WITHDRAWABLE_STATUSES.has(registration.status)) {
    const err = new Error("cannot_withdraw");
    err.code = "INVALID_STATE";
    throw err;
  }
  return updateRegistrationStatus(orgId, registrationId, {
    status: "withdrawn",
    reviewedBy: guardianId,
  });
}

export async function getWaitlistPosition(orgId, seasonId) {
  if (!orgId || !seasonId) throw new Error("orgId and seasonId are required");

  if (!hasDatabase()) {
    return Array.from(memoryRegistrations.values())
      .filter(
        (row) =>
          String(row.org_id) === String(orgId) &&
          String(row.season_id) === String(seasonId) &&
          row.status === "waitlisted"
      )
      .sort((a, b) => {
        const posDiff = (a.waitlist_position || Infinity) - (b.waitlist_position || Infinity);
        if (posDiff !== 0) return posDiff;
        return new Date(a.submitted_at) - new Date(b.submitted_at);
      })
      .map(serializeRow);
  }

  const result = await query(
    `SELECT * FROM registrations
     WHERE org_id = $1 AND season_id = $2 AND status = 'waitlisted'
     ORDER BY waitlist_position NULLS LAST, submitted_at ASC`,
    [orgId, seasonId]
  );
  return result.rows.map(serializeRow);
}

export async function promoteFromWaitlist(orgId, seasonId) {
  if (!orgId || !seasonId) throw new Error("orgId and seasonId are required");

  if (!hasDatabase()) {
    const waitlisted = (await getWaitlistPosition(orgId, seasonId))[0];
    if (!waitlisted) return null;
    await updateRegistrationStatus(orgId, waitlisted.id, { status: "pending" });
    return getRegistration(orgId, waitlisted.id);
  }

  const result = await query(
    `WITH next_in_line AS (
       SELECT id
       FROM registrations
       WHERE org_id = $1 AND season_id = $2 AND status = 'waitlisted'
       ORDER BY waitlist_position NULLS LAST, submitted_at ASC
       LIMIT 1
     )
     UPDATE registrations r
     SET status = 'pending',
         waitlist_position = NULL,
         reviewed_at = NOW(),
         updated_at = NOW()
     FROM next_in_line
     WHERE r.id = next_in_line.id
     RETURNING r.*`,
    [orgId, seasonId]
  );
  const promoted = result.rows[0] || null;
  if (promoted) {
    await reorderWaitlist(orgId, seasonId);
  }
  return serializeRow(promoted);
}

async function getNextWaitlistPosition(orgId, seasonId) {
  if (!hasDatabase()) {
    return memoryNextWaitlistPosition(orgId, seasonId);
  }
  const result = await query(
    `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_position
     FROM registrations
     WHERE org_id = $1 AND season_id = $2 AND status = 'waitlisted'`,
    [orgId, seasonId]
  );
  return Number(result.rows[0]?.next_position || 1);
}

async function reorderWaitlist(orgId, seasonId) {
  if (!hasDatabase()) {
    await memoryReorderWaitlist(orgId, seasonId);
    return;
  }
  await query(
    `WITH ordered AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position NULLS LAST, submitted_at ASC) AS rn
       FROM registrations
       WHERE org_id = $1 AND season_id = $2 AND status = 'waitlisted'
     )
     UPDATE registrations r
     SET waitlist_position = ordered.rn
     FROM ordered
     WHERE r.id = ordered.id`,
    [orgId, seasonId]
  );
}

async function memoryNextWaitlistPosition(orgId, seasonId) {
  const items = Array.from(memoryRegistrations.values()).filter(
    (row) =>
      String(row.org_id) === String(orgId) &&
      String(row.season_id) === String(seasonId) &&
      row.status === "waitlisted"
  );
  if (!items.length) return 1;
  return (
    items.reduce((max, row) => Math.max(max, Number(row.waitlist_position) || 0), 0) + 1
  );
}

async function memoryReorderWaitlist(orgId, seasonId) {
  const waitlisted = Array.from(memoryRegistrations.values())
    .filter(
      (row) =>
        String(row.org_id) === String(orgId) &&
        String(row.season_id) === String(seasonId) &&
        row.status === "waitlisted"
    )
    .sort((a, b) => {
      const posDiff = (a.waitlist_position || Infinity) - (b.waitlist_position || Infinity);
      if (posDiff !== 0) return posDiff;
      return new Date(a.submitted_at) - new Date(b.submitted_at);
    });
  waitlisted.forEach((row, index) => {
    row.waitlist_position = index + 1;
    memoryRegistrations.set(row.id, row);
  });
}
