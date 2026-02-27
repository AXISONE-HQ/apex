-- Apex v1 scale baseline indexes (Gate D2)

-- Tenant + recency access patterns for paginated list endpoints
CREATE INDEX IF NOT EXISTS idx_teams_org_created_at ON teams(org_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_players_org_created_at ON players(org_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_matches_org_created_at ON matches(org_id, created_at DESC, id);

-- Common team roster lookups within a tenant
CREATE INDEX IF NOT EXISTS idx_players_org_team_created_at ON players(org_id, team_id, created_at DESC, id);

-- Membership/org authorization scans
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON memberships(org_id, user_id);

-- Session lookup + expiry cleanup patterns
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires_at ON sessions(user_id, expires_at DESC);
