-- 029_evaluation_plans.sql
-- Evaluation Plan foundation (PR28)

CREATE TABLE IF NOT EXISTS evaluation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  team_id UUID,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  age_group TEXT,
  gender TEXT,
  evaluation_category TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_plans_scope_check CHECK (
    scope IN ('club','team')
  ),
  CONSTRAINT evaluation_plans_category_check CHECK (
    evaluation_category IN ('skill','physical','tryout','season_review')
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_plans_org_id_fkey') THEN
    ALTER TABLE evaluation_plans
      ADD CONSTRAINT evaluation_plans_org_id_fkey
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_plans_team_id_fkey') THEN
    ALTER TABLE evaluation_plans
      ADD CONSTRAINT evaluation_plans_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'evaluation_plans_created_by_user_id_fkey') THEN
    ALTER TABLE evaluation_plans
      ADD CONSTRAINT evaluation_plans_created_by_user_id_fkey
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_evaluation_plans_org_scope
  ON evaluation_plans(org_id, scope);

CREATE INDEX IF NOT EXISTS idx_evaluation_plans_org_sport
  ON evaluation_plans(org_id, sport);

CREATE INDEX IF NOT EXISTS idx_evaluation_plans_team
  ON evaluation_plans(team_id);
