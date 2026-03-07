-- EPIC 2 PR7: Players table

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  jersey_number INT,
  birth_year INT,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT players_status_check
    CHECK (status IN ('active', 'inactive')),

  CONSTRAINT players_first_name_length_check
    CHECK (char_length(first_name) BETWEEN 1 AND 120),

  CONSTRAINT players_last_name_length_check
    CHECK (char_length(last_name) BETWEEN 1 AND 120),

  CONSTRAINT players_display_name_length_check
    CHECK (display_name IS NULL OR char_length(display_name) <= 120),

  CONSTRAINT players_position_length_check
    CHECK (position IS NULL OR char_length(position) <= 64),

  CONSTRAINT players_notes_length_check
    CHECK (notes IS NULL OR char_length(notes) <= 500),

  CONSTRAINT players_jersey_number_check
    CHECK (jersey_number IS NULL OR jersey_number BETWEEN 0 AND 99),

  CONSTRAINT players_birth_year_check
    CHECK (
      birth_year IS NULL
      OR birth_year BETWEEN 1950 AND EXTRACT(YEAR FROM NOW())::INT
    )
);

CREATE INDEX IF NOT EXISTS idx_players_org_id
  ON players(org_id);

CREATE INDEX IF NOT EXISTS idx_players_team_id
  ON players(team_id);

CREATE INDEX IF NOT EXISTS idx_players_org_last_first
  ON players(org_id, last_name, first_name, created_at);

CREATE INDEX IF NOT EXISTS idx_players_org_status
  ON players(org_id, status);
