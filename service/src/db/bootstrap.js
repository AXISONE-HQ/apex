import { runMigrations } from "./migrate.js";
import { seedRbac } from "./seedRbac.js";

async function main() {
  const migrated = await runMigrations();
  const seeded = await seedRbac();
  console.log(JSON.stringify({ migrated, seeded }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
