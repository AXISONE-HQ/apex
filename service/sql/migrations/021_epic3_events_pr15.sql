-- 021_epic3_events_pr15.sql

ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS title TEXT;

UPDATE events
SET title = CASE
  WHEN type = 'practice' THEN 'Practice'
  WHEN type = 'game' THEN 'Game'
  ELSE 'Event'
END
WHERE title IS NULL;

ALTER TABLE events
  ALTER COLUMN title SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_org_team_starts_at ON events (org_id, team_id, starts_at);
