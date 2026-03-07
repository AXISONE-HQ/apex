-- 019_epic2_player_attendance.sql

CREATE TABLE player_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  recorded_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT player_attendance_notes_length_check CHECK (notes IS NULL OR char_length(notes) <= 500),
  CONSTRAINT player_attendance_unique UNIQUE (player_id, event_id)
);

CREATE INDEX player_attendance_org_event_idx ON player_attendance (org_id, event_id);
CREATE INDEX player_attendance_org_player_idx ON player_attendance (org_id, player_id);
CREATE INDEX player_attendance_org_status_idx ON player_attendance (org_id, status);
