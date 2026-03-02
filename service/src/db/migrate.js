import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasDatabase, query } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  if (!hasDatabase()) return { applied: false, reason: "DATABASE_URL not set" };

  const migrationsDir = path.resolve(__dirname, "../../sql/migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    try {
      await query(sql);
    } catch (err) {
      // In CI/parallel test startup, extensions can race; treat "already exists" as non-fatal.
      const msg = String(err?.message || "");
      if (err?.code === "23505" && msg.includes("pg_extension_name_index")) {
        continue;
      }
      throw err;
    }
  }

  return { applied: true, files };
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
