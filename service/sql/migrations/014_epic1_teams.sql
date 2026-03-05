-- EPIC 1 PR5: Teams (minimal, org-scoped)

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  season_year INT NOT NULL,
  competition_level TEXT,
  age_category TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,

  head_coach_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  training_frequency_per_week INT,
  default_training_duration_min INT,
  home_venue JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT teams_season_year_check
    CHECK (season_year BETWEEN 2000 AND 2100),

  CONSTRAINT teams_training_frequency_check
    CHECK (training_frequency_per_week IS NULL OR training_frequency_per_week BETWEEN 0 AND 14),

  CONSTRAINT teams_default_training_duration_check
    CHECK (default_training_duration_min IS NULL OR default_training_duration_min BETWEEN 15 AND 600),

  CONSTRAINT teams_name_length_check
    CHECK (char_length(name) BETWEEN 1 AND 120),

  CONSTRAINT teams_home_venue_object_check
    CHECK (home_venue IS NULL OR jsonb_typeof(home_venue) = 'object')
);

-- Prevent duplicate teams within an org+season.
-- Note: keeping the unique index approach for idempotency (IF NOT EXISTS).
CREATE UNIQUE INDEX IF NOT EXISTS ux_teams_org_season_name
  ON teams(org_id, season_year, name);

CREATE INDEX IF NOT EXISTS idx_teams_org_season
  ON teams(org_id, season_year);

CREATE INDEX IF NOT EXISTS idx_teams_org_archived
  ON teams(org_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_teams_org_head_coach
  ON teams(org_id, head_coach_user_id);
