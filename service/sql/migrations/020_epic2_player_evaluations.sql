-- 020_epic2_player_evaluations.sql

CREATE TABLE player_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  author_user_id UUID,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  summary TEXT CHECK (summary IS NULL OR char_length(summary) <= 1000),
  strengths TEXT CHECK (strengths IS NULL OR char_length(strengths) <= 1000),
  improvements TEXT CHECK (improvements IS NULL OR char_length(improvements) <= 1000),
  rating INT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX player_evaluations_org_player_created_idx ON player_evaluations (org_id, player_id, created_at DESC);
CREATE INDEX player_evaluations_org_status_idx ON player_evaluations (org_id, status);
CREATE INDEX player_evaluations_org_event_idx ON player_evaluations (org_id, event_id);
