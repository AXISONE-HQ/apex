import { hasDatabase, query } from "../db/client.js";

const memoryGuardians = new Map();
let guardianSeq = 1;

function makeMemoryId() {
  return `guardian_${guardianSeq++}`;
}

export async function createGuardian({
  orgId,
  firstName,
  lastName,
  displayName = null,
  email = null,
  phone = null,
  relationship = null,
  status = "active",
  notes = null,
}) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const id = makeMemoryId();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      email,
      phone,
      relationship,
      status,
      notes,
      created_at: now,
      updated_at: now,
    };
    memoryGuardians.set(id, row);
    return row;
  }

  const result = await query(
    `INSERT INTO guardians (
       id,
       org_id,
       first_name,
       last_name,
       display_name,
       email,
       phone,
       relationship,
       status,
       notes
     )
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, org_id, first_name, last_name, display_name, email,
               phone, relationship, status, notes, created_at, updated_at`,
    [
      orgId,
      firstName,
      lastName,
      displayName,
      email,
      phone,
      relationship,
      status,
      notes,
    ]
  );

  return result.rows[0];
}

export async function listGuardiansByOrg(orgId) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const rows = Array.from(memoryGuardians.values()).filter(
      (g) => String(g.org_id) === String(orgId)
    );
    return rows.sort((a, b) => {
      const last = a.last_name.localeCompare(b.last_name);
      if (last !== 0) return last;
      const first = a.first_name.localeCompare(b.first_name);
      if (first !== 0) return first;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  const result = await query(
    `SELECT id, org_id, first_name, last_name, display_name, email,
            phone, relationship, status, notes, created_at, updated_at
     FROM guardians
     WHERE org_id = $1
     ORDER BY last_name ASC, first_name ASC, created_at ASC`,
    [orgId]
  );

  return result.rows;
}

export async function getGuardianByIdAndOrg(guardianId, orgId) {
  if (!guardianId || !orgId) throw new Error("guardianId and orgId required");

  if (!hasDatabase()) {
    const row = memoryGuardians.get(guardianId);
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return row;
  }

  const result = await query(
    `SELECT id, org_id, first_name, last_name, display_name, email,
            phone, relationship, status, notes, created_at, updated_at
     FROM guardians
     WHERE id = $1 AND org_id = $2
     LIMIT 1`,
    [guardianId, orgId]
  );

  return result.rows[0] || null;
}

export async function updateGuardian(guardianId, orgId, patch = {}) {
  if (!guardianId || !orgId) throw new Error("guardianId and orgId required");

  const entries = Object.entries(patch || {});
  if (!entries.length) throw new Error("no_updatable_fields");

  if (!hasDatabase()) {
    const existing = memoryGuardians.get(guardianId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...patch,
      org_id: existing.org_id,
      id: existing.id,
      updated_at: now,
    };
    memoryGuardians.set(guardianId, updated);
    return updated;
  }

  const set = [];
  const values = [guardianId, orgId];
  let i = 3;

  for (const [key, value] of entries) {
    set.push(`${key} = $${i++}`);
    values.push(value);
  }

  set.push(`updated_at = NOW()`);

  const result = await query(
    `UPDATE guardians
     SET ${set.join(", ")}
     WHERE id = $1 AND org_id = $2
     RETURNING id, org_id, first_name, last_name, display_name, email,
               phone, relationship, status, notes, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}

export async function findGuardianByEmail(orgId, email) {
  if (!email || !orgId) return null;

  if (!hasDatabase()) {
    for (const guardian of memoryGuardians.values()) {
      if (String(guardian.org_id) === String(orgId) &&
          (guardian.email?.toLowerCase?.() || guardian.email) === email) {
        return guardian;
      }
    }
    return null;
  }

  const result = await query(
    `SELECT id, org_id, first_name, last_name, display_name, email,
            phone, relationship, status, notes, created_at, updated_at
     FROM guardians
     WHERE org_id = $1 AND lower(email) = $2
     LIMIT 1`,
    [orgId, email.toLowerCase()]
  );

  return result.rows[0] || null;
}
