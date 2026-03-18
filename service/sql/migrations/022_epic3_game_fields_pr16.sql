-- 022_epic3_game_fields_pr16.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'event_games'
  ) THEN
    CREATE TABLE event_games (
      event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      opponent_name TEXT NOT NULL,
      location_type TEXT NOT NULL,
      game_type TEXT NOT NULL,
      uniform_color TEXT,
      arrival_time TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (location_type IN ('home','away')),
      CHECK (game_type IN ('league','friendly','tournament'))
    );
  END IF;
END $$;
