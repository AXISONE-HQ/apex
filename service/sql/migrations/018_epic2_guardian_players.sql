-- 018_epic2_guardian_players.sql

CREATE TABLE guardian_players (
  guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT guardian_players_pk PRIMARY KEY (guardian_id, player_id)
);

CREATE INDEX guardian_players_org_player_idx ON guardian_players (org_id, player_id);
CREATE INDEX guardian_players_org_guardian_idx ON guardian_players (org_id, guardian_id);
