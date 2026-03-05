// Legacy compatibility layer for pre-EPIC1 team routes.
// This file adapts the old teams domain route expectations to the PR5 teamsRepo.
// TODO: remove once old domain /teams endpoints are migrated.

import { hasDatabase, query } from "../db/client.js";
import {
  createTeam as createTeamV1,
  listTeams as listTeamsV1,
  updateTeam as updateTeamV1,
} from "./teamsRepo.js";

export async function listTeamsByOrg(orgId, { limit = 50, offset = 0 } = {}) {
  // PR5 repo doesn't paginate yet; keep behavior simple.
  const items = await listTeamsV1(orgId, { includeArchived: false });
  return items.slice(offset, offset + limit);
}

export async function deleteTeam({ orgId, teamId }) {
  if (!orgId) throw new Error("orgId required");
  if (!teamId) return false;

  if (!hasDatabase()) {
    // Non-DB mode teams are held in-memory in teamsRepo.js.
    // No delete API exposed there; treat as not supported.
    return false;
  }

  const result = await query(
    `DELETE FROM teams
     WHERE org_id = $1 AND id = $2`,
    [orgId, teamId]
  );

  return result.rowCount > 0;
}

export async function createTeam({ orgId, name, code = null }) {
  // Old route uses {name, code}. PR5 schema doesn't include code.
  // Ignore code for now.
  return createTeamV1({ orgId, name, season_year: new Date().getUTCFullYear() });
}

export async function updateTeam({ orgId, teamId, name, code }) {
  // Old route uses {name, code}. PR5 schema doesn't include code.
  // Ignore code.
  const patch = {};
  if (name !== undefined) patch.name = name;
  return updateTeamV1(orgId, teamId, patch);
}
