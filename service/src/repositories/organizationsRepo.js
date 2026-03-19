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
    `SELECT id, name, slug, state_province, country, pulse_score,
            sport_type, logo_object_path, subscription_plan
     FROM organizations
     ORDER BY name ASC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    state_province: row.state_province,
    country: row.country,
    pulse_score: row.pulse_score ?? null,
    sport_type: row.sport_type ?? null,
    logo_object_path: row.logo_object_path ?? null,
    subscription_plan: row.subscription_plan ?? null
  }));
}

export async function getOrganizationById(id) {
  if (!id) return null;

  if (!hasDatabase()) {
    return demoOrgs.find((o) => o.id === id) || null;
  }

  const result = await query(
    `SELECT id, name, slug, state_province, country, pulse_score,
            sport_type, logo_object_path, subscription_plan, onboarding_status
     FROM organizations
     WHERE id = $1`,
    [id]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    state_province: row.state_province,
    country: row.country,
    pulse_score: row.pulse_score ?? null,
    sport_type: row.sport_type ?? null,
    logo_object_path: row.logo_object_path ?? null,
    subscription_plan: row.subscription_plan ?? null,
    onboarding_status: row.onboarding_status || {}
  };
}

export async function updateOrganizationProfile({
  id,
  name,
  sport_type,
  state_province,
  country,
  subscription_plan,
  logo_object_path,
  onboarding_status,
}) {
  if (!hasDatabase()) {
    return {
      id,
      name: name ?? 'Demo Club',
      sport_type: sport_type ?? null,
      state_province: state_province ?? null,
      country: country ?? null,
      subscription_plan: subscription_plan ?? null,
      logo_object_path: null,
      onboarding_status: onboarding_status ?? {},
    };
  }

  const result = await query(
    `UPDATE organizations
     SET name = COALESCE($2, name),
         sport_type = COALESCE($3, sport_type),
         state_province = COALESCE($4, state_province),
         country = COALESCE($5, country),
         subscription_plan = COALESCE($6, subscription_plan),
         logo_object_path = COALESCE($7, logo_object_path),
         onboarding_status = COALESCE($8, onboarding_status)
     WHERE id = $1
     RETURNING id, name, slug, state_province, country, pulse_score,
               sport_type, logo_object_path, subscription_plan, onboarding_status`,
    [id, name ?? null, sport_type ?? null, state_province ?? null, country ?? null, subscription_plan ?? null, logo_object_path ?? null, onboarding_status ?? null]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    state_province: row.state_province,
    country: row.country,
    pulse_score: row.pulse_score ?? null,
    sport_type: row.sport_type ?? null,
    logo_object_path: row.logo_object_path ?? null,
    subscription_plan: row.subscription_plan ?? null,
    onboarding_status: row.onboarding_status || {}
  };
}
