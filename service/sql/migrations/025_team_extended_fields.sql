ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS sport TEXT,
  ADD COLUMN IF NOT EXISTS season_label TEXT;

COMMENT ON COLUMN teams.sport IS 'Primary sport for the team (basketball, soccer, etc).';
COMMENT ON COLUMN teams.season_label IS 'Display label for the season (e.g. "2026 Outdoor", "2025-26 Winter").';
