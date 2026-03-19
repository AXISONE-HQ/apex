import { query, getPool } from "../src/db/client.js";

async function main() {
  const prefix = (process.env.LOAD_PLAYER_PREFIX || "load").toLowerCase();
  const like = `${prefix}%`;
  const result = await query(
    `DELETE FROM players
     WHERE LOWER(first_name) LIKE $1
        OR LOWER(last_name) LIKE $1`,
    [like]
  );
  console.log(`Removed ${result.rowCount} players with prefix "${prefix}"`);
}

main()
  .catch((err) => {
    console.error("Failed to remove players:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });
