-- 028_evaluation_block_categories.sql
-- Evaluation block categories + mapping

CREATE TABLE IF NOT EXISTS evaluation_block_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_block_category_map (
  block_id UUID NOT NULL REFERENCES evaluation_blocks(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES evaluation_block_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (block_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_block_category_map_category
  ON evaluation_block_category_map (category_id, block_id);

CREATE INDEX IF NOT EXISTS idx_eval_block_category_map_block
  ON evaluation_block_category_map (block_id);

INSERT INTO evaluation_block_categories (id, label)
VALUES
  ('technical', 'Technical'),
  ('physical', 'Physical'),
  ('tactical', 'Tactical'),
  ('mental', 'Mental'),
  ('decision_making', 'Decision Making'),
  ('discipline', 'Discipline')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;
