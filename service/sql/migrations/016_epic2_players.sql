-- EPIC 2 PR7: Players table additive migration

-- Ensure new columns exist
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS jersey_number INT,
  ADD COLUMN IF NOT EXISTS birth_year INT,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Normalize status defaults/checks
ALTER TABLE players
  ALTER COLUMN status SET DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_status_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_status_check
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_first_name_length_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_first_name_length_check
      CHECK (char_length(first_name) BETWEEN 1 AND 120);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_last_name_length_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_last_name_length_check
      CHECK (char_length(last_name) BETWEEN 1 AND 120);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_display_name_length_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_display_name_length_check
      CHECK (display_name IS NULL OR char_length(display_name) <= 120);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_position_length_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_position_length_check
      CHECK (position IS NULL OR char_length(position) <= 64);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_notes_length_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_notes_length_check
      CHECK (notes IS NULL OR char_length(notes) <= 500);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_jersey_number_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_jersey_number_check
      CHECK (jersey_number IS NULL OR jersey_number BETWEEN 0 AND 99);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'players_birth_year_check'
      AND table_name = 'players'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_birth_year_check
      CHECK (
        birth_year IS NULL
        OR birth_year BETWEEN 1950 AND EXTRACT(YEAR FROM NOW())::INT
      );
  END IF;
END $$;

-- Helpful indexes for ordering/filtering
CREATE INDEX IF NOT EXISTS idx_players_org_last_first
  ON players(org_id, last_name, first_name, created_at);

CREATE INDEX IF NOT EXISTS idx_players_org_status
  ON players(org_id, status);
