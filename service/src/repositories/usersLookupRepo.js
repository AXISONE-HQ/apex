import { hasDatabase, query } from "../db/client.js";

export async function findUserByEmail(email) {
  if (!email) return null;

  if (!hasDatabase()) {
    // In non-DB mode, usersRepo is in-memory and not queryable by email.
    // For PR2, we treat this as "not found" to keep behavior strict.
    return null;
  }

  const res = await query(
    `SELECT id, email, name
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );

  if (!res.rows.length) return null;
  return { id: res.rows[0].id, email: res.rows[0].email, name: res.rows[0].name };
}
