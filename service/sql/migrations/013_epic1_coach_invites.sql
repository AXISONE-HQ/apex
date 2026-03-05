-- EPIC 1 PR4: coach invites (secure token hashing, auditable)

CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_code TEXT NOT NULL DEFAULT 'ManagerCoach',
  coach_type TEXT NOT NULL,
  team_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  CONSTRAINT organization_invites_coach_type_check
    CHECK (coach_type IN ('head','assistant')),

  CONSTRAINT organization_invites_status_check
    CHECK (status IN ('pending','accepted','revoked','expired')),

  CONSTRAINT organization_invites_email_lowercase_check
    CHECK (email = lower(email))
);

-- Prevent duplicated pending invites per org+email (optional but practical)
CREATE UNIQUE INDEX IF NOT EXISTS ux_org_invites_pending_org_email
  ON organization_invites(org_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_org_invites_token_hash
  ON organization_invites(token_hash);

CREATE INDEX IF NOT EXISTS idx_org_invites_org_status
  ON organization_invites(org_id, status);
