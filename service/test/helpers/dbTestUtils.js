import { runMigrations } from "../src/db/migrate.js";
import { query } from "../src/db/client.js";

export const DB_ENABLED = Boolean(process.env.DATABASE_URL);
export const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_USER_UUIDS = {
  u1: "00000000-0000-0000-0000-000000000011",
  u2: "00000000-0000-0000-0000-000000000012",
  u3: "00000000-0000-0000-0000-000000000013",
  u4: "00000000-0000-0000-0000-000000000014",
  u5: "00000000-0000-0000-0000-000000000015",
  u6: "00000000-0000-0000-0000-000000000016",
  u7: "00000000-0000-0000-0000-000000000017",
  u8: "00000000-0000-0000-0000-000000000018",
  u9: "00000000-0000-0000-0000-000000000019",
  u10: "00000000-0000-0000-0000-000000000020"
};

export async function seedTestOrgAndUsers() {
  if (!DB_ENABLED) return;
  await runMigrations();
  await query(
    "INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING",
    [TEST_ORG_ID, "Test Org", "test-org"]
  );

  for (const [label, id] of Object.entries(TEST_USER_UUIDS)) {
    await query(
      "INSERT INTO users (id, external_uid, email, name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING",
      [id, `ext_${label}`, `${label}@example.com`, `User ${label.slice(1)}`]
    );
  }
}

export function testUser(label, extra = {}) {
  if (!DB_ENABLED) return { id: label, ...extra };
  return { id: TEST_USER_UUIDS[label], ...extra };
}
