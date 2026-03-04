-- EPIC 1 PR1: org profile + subscription plan + onboarding tracking

-- 1) Extend organizations with EPIC 1 profile/plan fields
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sport_type TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_status JSONB NOT NULL DEFAULT '{}'::jsonb;

-- (Optional) convenience index for basic status queries
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_status_gin
  ON organizations USING GIN (onboarding_status);

-- 2) Auditable onboarding events log
CREATE TABLE IF NOT EXISTS organization_onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_code TEXT NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_onboarding_events_org_id_created_at
  ON organization_onboarding_events(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_onboarding_events_event_code
  ON organization_onboarding_events(event_code);
