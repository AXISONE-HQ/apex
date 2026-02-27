import { hasDatabase, query } from "../db/client.js";

const matches = [];

export async function listMatchesByOrg(orgId) {
  if (!hasDatabase()) return matches.filter((m) => m.orgId === orgId);

  const result = await query(
    `SELECT id, org_id, home_team_id, away_team_id, starts_at, status, created_at, updated_at
     FROM matches WHERE org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

export async function createMatch({ orgId, homeTeamId, awayTeamId, startsAt = null }) {
  if (!hasDatabase()) {
    const match = {
      id: `match_${matches.length + 1}`,
      orgId,
      homeTeamId,
      awayTeamId,
      startsAt,
      status: "scheduled"
    };
    matches.push(match);
    return match;
  }

  const result = await query(
    `INSERT INTO matches (org_id, home_team_id, away_team_id, starts_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, org_id, home_team_id, away_team_id, starts_at, status, created_at, updated_at`,
    [orgId, homeTeamId, awayTeamId, startsAt]
  );
  return result.rows[0];
}

export async function submitMatchResult({ matchId, homeScore, awayScore, submittedBy }) {
  if (!hasDatabase()) {
    return { matchId, homeScore, awayScore, submittedBy, approved: false };
  }

  const result = await query(
    `INSERT INTO match_results (match_id, home_score, away_score, submitted_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (match_id)
     DO UPDATE SET home_score = EXCLUDED.home_score,
                   away_score = EXCLUDED.away_score,
                   submitted_by = EXCLUDED.submitted_by,
                   submitted_at = NOW(),
                   approved = FALSE,
                   approved_by = NULL,
                   approved_at = NULL
     RETURNING match_id, home_score, away_score, submitted_by, submitted_at, approved`,
    [matchId, homeScore, awayScore, submittedBy]
  );
  return result.rows[0];
}
