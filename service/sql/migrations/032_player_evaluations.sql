-- 032_player_evaluations.sql
-- Player scoring + edit history (PR32)

ALTER TABLE player_evaluations
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES evaluation_blocks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS score JSONB,
  ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_evaluations_session_unique'
  ) THEN
    ALTER TABLE player_evaluations
      ADD CONSTRAINT player_evaluations_session_unique
      UNIQUE (session_id, player_id, block_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_player_evaluations_org_session
  ON player_evaluations(org_id, session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_evaluations_player
  ON player_evaluations(player_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_evaluations_block
  ON player_evaluations(block_id)
  WHERE session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS evaluation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_evaluation_id UUID NOT NULL REFERENCES player_evaluations(id) ON DELETE CASCADE,
  previous_score JSONB NOT NULL,
  new_score JSONB NOT NULL,
  edited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluation_logs_player_eval
  ON evaluation_logs(player_evaluation_id);

CREATE INDEX IF NOT EXISTS idx_evaluation_logs_editor
  ON evaluation_logs(edited_by_user_id);
