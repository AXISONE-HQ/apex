import pg from "pg";

let pool;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!hasDatabase()) return null;
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function query(text, params = []) {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL is not set");
  return p.query(text, params);
}
