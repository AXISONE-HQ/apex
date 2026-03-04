import { hasDatabase, query } from "../db/client.js";

export async function insertOnboardingEvent({ orgId, event_code, actor_user_id = null, meta = {} }) {
  if (!hasDatabase()) return { ok: true };

  await query(
    `INSERT INTO organization_onboarding_events (org_id, event_code, actor_user_id, meta)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [orgId, event_code, actor_user_id, JSON.stringify(meta || {})]
  );

  return { ok: true };
}
