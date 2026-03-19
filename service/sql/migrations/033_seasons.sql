-- Seasons module (Drop 1)
-- Adds org-scoped seasons with lifecycle state

CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  year INT,
  status TEXT NOT NULL DEFAULT 'draft',
  starts_on DATE,
  ends_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, label)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seasons_status_check'
  ) THEN
    ALTER TABLE seasons
      ADD CONSTRAINT seasons_status_check
      CHECK (status IN ('draft', 'active', 'completed', 'archived'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seasons_year_check'
  ) THEN
    ALTER TABLE seasons
      ADD CONSTRAINT seasons_year_check
      CHECK (year IS NULL OR year BETWEEN 2000 AND 2100);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seasons_label_length_check'
  ) THEN
    ALTER TABLE seasons
      ADD CONSTRAINT seasons_label_length_check
      CHECK (char_length(label) BETWEEN 1 AND 120);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seasons_date_range_check'
  ) THEN
    ALTER TABLE seasons
      ADD CONSTRAINT seasons_date_range_check
      CHECK (
        starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on
      );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_seasons_org
  ON seasons(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seasons_org_status
  ON seasons(org_id, status);
