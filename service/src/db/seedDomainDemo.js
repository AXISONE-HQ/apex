import { hasDatabase, query } from "./client.js";

export async function seedDomainDemo() {
  if (!hasDatabase()) return { applied: false, reason: "DATABASE_URL not set" };

  const orgRes = await query(`SELECT id FROM organizations ORDER BY created_at LIMIT 1`);
  if (!orgRes.rows.length) return { applied: false, reason: "no organizations found" };
  const orgId = orgRes.rows[0].id;

  const t1 = await query(
    `INSERT INTO teams (org_id, name, code) VALUES ($1, 'Sharks', 'SHK')
     ON CONFLICT (org_id, name) DO UPDATE SET code = EXCLUDED.code
     RETURNING id`,
    [orgId]
  );
  const t2 = await query(
    `INSERT INTO teams (org_id, name, code) VALUES ($1, 'Wolves', 'WLF')
     ON CONFLICT (org_id, name) DO UPDATE SET code = EXCLUDED.code
     RETURNING id`,
    [orgId]
  );

  await query(
    `INSERT INTO players (org_id, team_id, first_name, last_name, email)
     VALUES ($1, $2, 'Alex', 'Stone', 'alex.stone@example.com')
     ON CONFLICT (org_id, email) DO NOTHING`,
    [orgId, t1.rows[0].id]
  );
  await query(
    `INSERT INTO players (org_id, team_id, first_name, last_name, email)
     VALUES ($1, $2, 'Mia', 'Vale', 'mia.vale@example.com')
     ON CONFLICT (org_id, email) DO NOTHING`,
    [orgId, t2.rows[0].id]
  );

  return { applied: true, orgId };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDomainDemo()
    .then((r) => {
      console.log(JSON.stringify(r));
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
