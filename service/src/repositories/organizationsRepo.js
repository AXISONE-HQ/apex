import { hasDatabase, query } from "../db/client.js";

const demoOrgs = [
  {
    id: "org_demo",
    name: "Demo Club",
    slug: "demo-org",
    state_province: "Ontario",
    country: "Canada",
    pulse_score: 82
  }
];

export async function listOrganizations() {
  if (!hasDatabase()) {
    return demoOrgs;
  }

  const result = await query(
    `SELECT id, name, slug, state_province, country, pulse_score
     FROM organizations
     ORDER BY name ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    state_province: row.state_province,
    country: row.country,
    pulse_score: row.pulse_score ?? null
  }));
}
