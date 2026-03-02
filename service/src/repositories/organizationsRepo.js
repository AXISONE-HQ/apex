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

export async function createOrganization({ name, slug, country, state_province = null }) {
  if (!hasDatabase()) {
    const existing = demoOrgs.find((o) => o.slug === slug);
    if (existing) {
      const err = new Error("org_slug_taken");
      err.code = "org_slug_taken";
      throw err;
    }

    const org = {
      id: `org_${demoOrgs.length + 1}`,
      name,
      slug,
      country,
      state_province,
      pulse_score: null
    };
    demoOrgs.push(org);
    return org;
  }

  try {
    const result = await query(
      `INSERT INTO organizations (name, slug, country, state_province)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, country, state_province`,
      [name, slug, country, state_province]
    );
    return result.rows[0];
  } catch (err) {
    // Postgres unique constraint violation
    if (err && err.code === "23505") {
      const e = new Error("org_slug_taken");
      e.code = "org_slug_taken";
      throw e;
    }
    throw err;
  }
}
