import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasDatabase, query } from "./client.js";

// NOTE: Node's built-in test runner executes test files concurrently in a single
// process. Many tests call runMigrations() in before() hooks; we single-flight
// migrations per-process to avoid DDL races (e.g., CREATE EXTENSION).
const MIGRATIONS_INSTANCE_ID = Math.random().toString(36).slice(2, 10);
if (process.env.DEBUG_MIGRATIONS === "1") {
  // stderr so it shows even if stdout is buffered / TAP-interleaved
  // eslint-disable-next-line no-console
  console.error(`[migrations-debug] instance=${MIGRATIONS_INSTANCE_ID} url=${import.meta.url}`);
}

let migrationsPromise = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  if (!hasDatabase()) return { applied: false, reason: "DATABASE_URL not set" };

  if (!migrationsPromise) {
    migrationsPromise = (async () => {
      const migrationsDir = path.resolve(__dirname, "../../sql/migrations");
      const files = (await fs.readdir(migrationsDir))
        .filter((f) => f.endsWith(".sql"))
        .sort();

      for (const file of files) {
        const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
        await query(sql);
      }

      return { applied: true, files };
    })();
  }

  return migrationsPromise;
}

if (process.argv[1] === __filename) {
  runMigrations()
    .then((r) => {
      console.log(JSON.stringify(r));
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
