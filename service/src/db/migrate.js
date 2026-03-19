import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasDatabase, query } from "./client.js";

// NOTE: Node's built-in test runner executes test files concurrently in a single
// process. Many tests call runMigrations() in before() hooks.
//
// We must single-flight migrations across the *entire process* because Node ESM
// can still produce duplicate module instances under concurrent test graphs.
// Using a global promise prevents DDL races (e.g., CREATE EXTENSION) even if the
// module is loaded twice.
const GLOBAL_KEY = "__apexRunMigrationsPromise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  if (!hasDatabase()) return { applied: false, reason: "DATABASE_URL not set" };

  if (globalThis[GLOBAL_KEY]) {
    return globalThis[GLOBAL_KEY];
  }

  globalThis[GLOBAL_KEY] = (async () => {
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

  try {
    return await globalThis[GLOBAL_KEY];
  } catch (err) {
    // Allow retry if migrations failed.
    globalThis[GLOBAL_KEY] = null;
    throw err;
  }
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
