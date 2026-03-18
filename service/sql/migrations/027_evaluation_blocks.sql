-- 027_evaluation_blocks.sql
-- Evaluation Block foundation (PR26)

CREATE TABLE IF NOT EXISTS evaluation_blocks (
  id UUID PRIMARY KEY,
  org_id UUID,
  team_id UUID,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  evaluation_type TEXT NOT NULL,
  scoring_method TEXT NOT NULL,
  scoring_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  instructions TEXT NOT NULL,
  objective TEXT,
  difficulty TEXT,
  created_by_type TEXT NOT NULL,
  created_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_blocks_created_by_type_check CHECK (
    created_by_type IN ('platform','club','coach','ai')
  ),
  CONSTRAINT evaluation_blocks_scoring_method_check CHECK (
    scoring_method IN ('numeric_scale','rating_scale','custom_metric')
  ),
  CONSTRAINT evaluation_blocks_difficulty_check CHECK (
    difficulty IS NULL OR difficulty IN ('easy','medium','hard')
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_blocks_org_id_fkey') THEN
    ALTER TABLE evaluation_blocks
      ADD CONSTRAINT evaluation_blocks_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_blocks_team_id_fkey') THEN
    ALTER TABLE evaluation_blocks
      ADD CONSTRAINT evaluation_blocks_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_blocks_created_by_id_fkey') THEN
    ALTER TABLE evaluation_blocks
      ADD CONSTRAINT evaluation_blocks_created_by_id_fkey
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_evaluation_blocks_org_sport
  ON evaluation_blocks(org_id, sport);

CREATE INDEX IF NOT EXISTS idx_evaluation_blocks_org_creator
  ON evaluation_blocks(org_id, created_by_type);

CREATE INDEX IF NOT EXISTS idx_evaluation_blocks_team
  ON evaluation_blocks(team_id);
