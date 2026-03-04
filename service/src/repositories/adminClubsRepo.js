import { hasDatabase, query } from "../db/client.js";

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

export async function createOrganization({
  name,
  sport_type,
  state_province = null,
  country = null,
  subscription_plan = "trial",
  onboarding_status,
}) {
  if (!hasDatabase()) {
    const id = "org_demo";
    return {
      id,
      name,
      slug: slugify(name) || "org",
      sport_type,
      state_province,
      country,
      subscription_plan,
      onboarding_status: onboarding_status || {},
      logo_object_path: null,
    };
  }

  const slug = slugify(name);
  if (!slug) throw new Error("invalid_org_name");

  const result = await query(
    `INSERT INTO organizations (name, slug, sport_type, state_province, country, subscription_plan, onboarding_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, name, slug, sport_type, state_province, country, subscription_plan, onboarding_status, logo_object_path`,
    [name, slug, sport_type, state_province, country, subscription_plan, JSON.stringify(onboarding_status || {})]
  );

  return result.rows[0];
}

export async function ensureMembershipRole({ userId, orgId, roleCode }) {
  if (!hasDatabase()) {
    return { ok: true };
  }

  const membership = await query(
    `INSERT INTO memberships (user_id, org_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, org_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING id`,
    [userId, orgId]
  );

  const role = await query(
    `INSERT INTO roles (code)
     VALUES ($1)
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING id`,
    [roleCode]
  );

  await query(
    `INSERT INTO membership_roles (membership_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (membership_id, role_id) DO NOTHING`,
    [membership.rows[0].id, role.rows[0].id]
  );

  return { ok: true };
}

export async function insertOnboardingEvent({ orgId, event_code, actor_user_id = null, meta = {} }) {
  if (!hasDatabase()) return { ok: true };

  await query(
    `INSERT INTO organization_onboarding_events (org_id, event_code, actor_user_id, meta)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [orgId, event_code, actor_user_id, JSON.stringify(meta || {})]
  );

  return { ok: true };
}
