-- EPIC 1 PR5: Teams (minimal, org-scoped)
--
-- NOTE: A legacy `teams` table already exists from `002_domain_mvp.sql`.
-- This migration is additive and safe to apply even when `teams` already exists.

-- Add PR5 columns (no-op if already present)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS season_year INT,
  ADD COLUMN IF NOT EXISTS competition_level TEXT,
  ADD COLUMN IF NOT EXISTS age_category TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS head_coach_user_id UUID,
  ADD COLUMN IF NOT EXISTS training_frequency_per_week INT,
  ADD COLUMN IF NOT EXISTS default_training_duration_min INT,
  ADD COLUMN IF NOT EXISTS home_venue JSONB;

-- Foreign key for optional head coach assignment
ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_head_coach_user_id_fkey
  FOREIGN KEY (head_coach_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Guardrail checks
ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_season_year_check
    CHECK (season_year IS NULL OR season_year BETWEEN 2000 AND 2100);

ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_training_frequency_check
    CHECK (training_frequency_per_week IS NULL OR training_frequency_per_week BETWEEN 0 AND 14);

ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_default_training_duration_check
    CHECK (default_training_duration_min IS NULL OR default_training_duration_min BETWEEN 15 AND 600);

ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_name_length_check
    CHECK (char_length(name) BETWEEN 1 AND 120);

ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_home_venue_object_check
    CHECK (home_venue IS NULL OR jsonb_typeof(home_venue) = 'object');

-- New uniqueness for season-scoped teams.
-- NOTE: legacy schema already has UNIQUE(org_id, name). We keep it for backwards compatibility,
-- and add a new unique index for org+season+name.
CREATE UNIQUE INDEX IF NOT EXISTS ux_teams_org_season_name
  ON teams(org_id, season_year, name);

CREATE INDEX IF NOT EXISTS idx_teams_org_season
  ON teams(org_id, season_year);

CREATE INDEX IF NOT EXISTS idx_teams_org_archived
  ON teams(org_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_teams_org_head_coach
  ON teams(org_id, head_coach_user_id);
