-- 031_evaluation_sessions.sql
-- Evaluation session foundation (PR31)

CREATE TABLE IF NOT EXISTS evaluation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  evaluation_plan_id UUID NOT NULL REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_sessions_event_plan_unique UNIQUE (event_id, evaluation_plan_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_sessions_org_team
  ON evaluation_sessions(org_id, team_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_sessions_event
  ON evaluation_sessions(event_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_sessions_plan
  ON evaluation_sessions(evaluation_plan_id);
