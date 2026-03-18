DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_org_season_name_unique'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT teams_org_season_name_unique
      UNIQUE (org_id, season_year, name);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'ux_teams_org_season_name'
  ) THEN
    DROP INDEX ux_teams_org_season_name;
  END IF;
END $$;
