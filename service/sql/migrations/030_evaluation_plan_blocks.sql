-- 030_evaluation_plan_blocks.sql
-- Plan block builder foundation (PR29)

CREATE TABLE IF NOT EXISTS evaluation_plan_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES evaluation_plans(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES evaluation_blocks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_plan_blocks_position_check CHECK (position > 0),
  CONSTRAINT evaluation_plan_blocks_unique_position UNIQUE (plan_id, position)
);

CREATE INDEX IF NOT EXISTS idx_eval_plan_blocks_plan_position
  ON evaluation_plan_blocks(plan_id, position);

CREATE INDEX IF NOT EXISTS idx_eval_plan_blocks_block
  ON evaluation_plan_blocks(block_id);
