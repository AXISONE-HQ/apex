import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasDatabase, query } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  if (!hasDatabase()) return { applied: false, reason: "DATABASE_URL not set" };

  const migrationPath = path.resolve(__dirname, "../../sql/migrations/001_auth_core.sql");
  const sql = await fs.readFile(migrationPath, "utf8");
  await query(sql);
  return { applied: true, file: "001_auth_core.sql" };
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
