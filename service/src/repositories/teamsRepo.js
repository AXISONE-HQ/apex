import { hasDatabase, query } from "../db/client.js";

const UPDATABLE_FIELDS = new Set([
  "name",
  "season_year",
  "competition_level",
  "age_category",
  "is_archived",
  "head_coach_user_id",
  "training_frequency_per_week",
  "default_training_duration_min",
  "home_venue",
]);

// In-memory fallback (non-DB mode)
const teams = new Map();
let teamSeq = 1;

function makeMemoryId() {
  return `team_${teamSeq++}`;
}

export async function createTeam({
  orgId,
  // Legacy params (domain routes)
  code = null,
  // PR5 params
  name,
  season_year,
  competition_level = null,
  age_category = null,
  is_archived = false,
  head_coach_user_id = null,
  training_frequency_per_week = null,
  default_training_duration_min = null,
  home_venue = null,
}) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    // Enforce PR5 uniqueness semantics in memory mode as well.
    for (const t of teams.values()) {
      if (
        String(t.org_id) === String(orgId) &&
        Number(t.season_year) === Number(season_year) &&
        String(t.name) === String(name)
      ) {
        const err = new Error("duplicate_team");
        err.code = "23505";
        throw err;
      }
    }

    const id = makeMemoryId();
    const now = new Date().toISOString();
    const row = {
      id,
      org_id: String(orgId),
      name,
      season_year,
      competition_level,
      age_category,
      is_archived: Boolean(is_archived),
      head_coach_user_id,
      training_frequency_per_week,
      default_training_duration_min,
      home_venue,
      created_at: now,
      updated_at: now,
    };
    teams.set(id, row);
    return row;
  }

  const result = await query(
    `INSERT INTO teams (
       org_id,
       name,
       season_year,
       competition_level,
       age_category,
       is_archived,
       head_coach_user_id,
       training_frequency_per_week,
       default_training_duration_min,
       home_venue
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING
       id, org_id, name, season_year, competition_level, age_category, is_archived,
       head_coach_user_id, training_frequency_per_week, default_training_duration_min, home_venue,
       created_at, updated_at`,
    [
      orgId,
      name,
      season_year,
      competition_level,
      age_category,
      is_archived,
      head_coach_user_id,
      training_frequency_per_week,
      default_training_duration_min,
      home_venue,
    ]
  );

  return result.rows[0];
}

export async function listTeams(orgId, { includeArchived = false } = {}) {
  if (!orgId) throw new Error("orgId required");

  if (!hasDatabase()) {
    const rows = Array.from(teams.values()).filter((t) => String(t.org_id) === String(orgId));
    const filtered = includeArchived ? rows : rows.filter((t) => !t.is_archived);
    return filtered.sort((a, b) => {
      if (a.season_year !== b.season_year) return b.season_year - a.season_year;
      if (a.name !== b.name) return String(a.name).localeCompare(String(b.name));
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  }

  const whereArchived = includeArchived ? "" : "AND is_archived = false";

  const result = await query(
    `SELECT
       id, org_id, name, season_year, competition_level, age_category, is_archived,
       head_coach_user_id, training_frequency_per_week, default_training_duration_min, home_venue,
       created_at, updated_at
     FROM teams
     WHERE org_id = $1
     ${whereArchived}
     ORDER BY season_year DESC, name ASC, created_at DESC`,
    [orgId]
  );

  return result.rows;
}

export async function getTeamById(orgId, teamId) {
  if (!orgId) throw new Error("orgId required");
  if (!teamId) return null;

  if (!hasDatabase()) {
    const row = teams.get(teamId) || null;
    if (!row) return null;
    if (String(row.org_id) !== String(orgId)) return null;
    return row;
  }

  const result = await query(
    `SELECT
       id, org_id, name, season_year, competition_level, age_category, is_archived,
       head_coach_user_id, training_frequency_per_week, default_training_duration_min, home_venue,
       created_at, updated_at
     FROM teams
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [orgId, teamId]
  );

  return result.rows[0] || null;
}

export async function updateTeam(orgId, teamId, patch = {}) {
  if (!orgId) throw new Error("orgId required");
  if (!teamId) return null;

  const entries = Object.entries(patch || {}).filter(([k]) => UPDATABLE_FIELDS.has(k));
  if (!entries.length) {
    // Defensive: callers must pass at least one allowed field.
    throw new Error("no_updatable_fields");
  }

  if (!hasDatabase()) {
    const existing = teams.get(teamId);
    if (!existing) return null;
    if (String(existing.org_id) !== String(orgId)) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...Object.fromEntries(entries),
      org_id: existing.org_id,
      id: existing.id,
      updated_at: now,
    };
    teams.set(teamId, updated);
    return updated;
  }

  const set = [];
  const values = [orgId, teamId];
  let i = 3;

  for (const [key, value] of entries) {
    // Ensure undefined doesn't leak into PG params (normalize to null).
    const normalized = value === undefined ? null : value;
    set.push(`${key} = $${i++}`);
    values.push(normalized);
  }

  // Always bump updated_at.
  set.push(`updated_at = NOW()`);

  const result = await query(
    `UPDATE teams
     SET ${set.join(", ")}
     WHERE org_id = $1 AND id = $2
     RETURNING
       id, org_id, name, season_year, competition_level, age_category, is_archived,
       head_coach_user_id, training_frequency_per_week, default_training_duration_min, home_venue,
       created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
}
