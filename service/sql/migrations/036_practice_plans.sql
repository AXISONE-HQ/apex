-- Practice Plan Generator foundations (Drop 1)
-- Drill library, practice plans, and ordered plan blocks

CREATE TABLE IF NOT EXISTS practice_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  default_duration_minutes INT CHECK (default_duration_minutes IS NULL OR default_duration_minutes BETWEEN 1 AND 600),
  description TEXT,
  instructions TEXT,
  equipment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_drills_org_category
  ON practice_drills(org_id, category);

CREATE INDEX IF NOT EXISTS idx_practice_drills_focus_gin
  ON practice_drills USING GIN (focus_areas);

CREATE TABLE IF NOT EXISTS practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  coach_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  practice_date DATE,
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600),
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'practice_plans_status_check'
  ) THEN
    ALTER TABLE practice_plans
      ADD CONSTRAINT practice_plans_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_practice_plans_org_team_date
  ON practice_plans(org_id, team_id, practice_date);

CREATE INDEX IF NOT EXISTS idx_practice_plans_org_status
  ON practice_plans(org_id, status);

CREATE TABLE IF NOT EXISTS practice_plan_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES practice_plans(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES practice_drills(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  focus_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  duration_minutes INT CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 600),
  start_offset_minutes INT CHECK (start_offset_minutes IS NULL OR start_offset_minutes BETWEEN 0 AND 1440),
  player_grouping TEXT,
  position INT NOT NULL CHECK (position >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_plan_blocks_plan_position
  ON practice_plan_blocks(plan_id, position);

-- Row-level security scoped by org context
ALTER TABLE practice_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_plan_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'practice_drills_org_policy'
  ) THEN
    CREATE POLICY practice_drills_org_policy ON practice_drills
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      )
      WITH CHECK (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'practice_plans_org_policy'
  ) THEN
    CREATE POLICY practice_plans_org_policy ON practice_plans
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      )
      WITH CHECK (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'practice_plan_blocks_org_policy'
  ) THEN
    CREATE POLICY practice_plan_blocks_org_policy ON practice_plan_blocks
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR EXISTS (
          SELECT 1
          FROM practice_plans pp
          WHERE pp.id = practice_plan_blocks.plan_id
            AND pp.org_id::text = current_setting('app.current_org_id', true)
        )
      )
      WITH CHECK (
        current_setting('app.current_org_id', true) IS NULL
        OR EXISTS (
          SELECT 1
          FROM practice_plans pp
          WHERE pp.id = practice_plan_blocks.plan_id
            AND pp.org_id::text = current_setting('app.current_org_id', true)
        )
      );
  END IF;
END$$;
