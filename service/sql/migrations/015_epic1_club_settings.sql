-- EPIC 1 PR6: Club settings (organizations.settings)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
