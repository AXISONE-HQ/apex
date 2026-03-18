import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { badRequest } from "../domain/_helpers.js";
import {
  createTeam,
  getTeamById,
  listTeams,
  updateTeam,
} from "../../repositories/teamsRepo.js";
import { listPlayersByTeam } from "../../repositories/playersRepo.js";
import { listCoachesByOrg } from "../../repositories/clubStaffRepo.js";
import { normalizeSeasonLabel, deriveSeasonYear } from "../../lib/season.js";
import { validateHeadCoachAssignment } from "../../lib/teamValidation.js";
import { getOrganizationById } from "../../repositories/organizationsRepo.js";

const router = Router({ mergeParams: true });

const HOME_VENUE_KEYS = new Set([
  "name",
  "address_line1",
  "address_line2",
  "city",
  "state_province",
  "country",
  "postal_code",
]);

const CREATE_FIELDS = new Set([
  "name",
  "season_year",
  "season_label",
  "sport",
  "competition_level",
  "team_level",
  "age_category",
  "head_coach_user_id",
  "training_frequency_per_week",
  "default_training_duration_min",
  "home_venue",
]);

const PATCH_FIELDS = new Set([
  ...CREATE_FIELDS,
  "is_archived",
]);

const ALLOWED_SPORT_TYPES = new Set(["basketball", "soccer", "hockey", "volleyball", "other"]);

function allowTeamsAdmin(req, orgId) {
  if (req.user?.isPlatformAdmin === true) return true;
  const roles = req.user?.roles || [];
  const scopedOrgs = (req.user?.orgScopes || []).map(String);
  const hasClubRole = roles.some((role) => ["OrgAdmin", "ManagerCoach"].includes(role));
  if (!hasClubRole) return false;
  return scopedOrgs.includes(String(orgId));
}

function allowTeamRosterAccess(req, orgId, teamId) {
  if (req.user?.isPlatformAdmin === true) return true;
  const roles = req.user?.roles || [];
  const orgScopes = (req.user?.orgScopes || []).map(String);
  const teamScopes = (req.user?.teamScopes || []).map(String);
  const orgAllowed = orgScopes.includes(String(orgId));

  const orgLevelRoles = ["OrgAdmin", "ManagerCoach", "ClubDirector"];
  if (orgAllowed && roles.some((role) => orgLevelRoles.includes(role))) {
    return true;
  }

  if (!orgAllowed) return false;

  if (roles.includes("Coach") || roles.includes("ManagerCoach")) {
    if (!teamScopes.length) return false;
    return teamScopes.includes(String(teamId));
  }

  return false;
}

function parseBoolean(v, defaultValue = false) {
  if (v === undefined || v === null || v === "") return defaultValue;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  throw new Error("invalid_boolean");
}

function rejectUnknownFields(obj, allowed) {
  if (!obj || typeof obj !== "object") return;
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) throw new Error(`unknown_field:${k}`);
  }
}

function sanitizeString(value, { field, required = false, max = 120 }) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field}_required`);
    return null;
  }
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new Error(`${field}_required`);
    return null;
  }
  if (max && trimmed.length > max) throw new Error(`${field}_too_long`);
  return trimmed;
}

function normalizeSport(value) {
  const sport = sanitizeString(value, { field: "sport", required: true, max: 32 });
  const normalized = sport.toLowerCase();
  if (!ALLOWED_SPORT_TYPES.has(normalized)) {
    throw new Error("invalid_sport");
  }
  return normalized;
}

function normalizeTeamLevel(value) {
  return sanitizeString(value, { field: "team_level", required: true, max: 80 });
}

function normalizeAgeGroup(value) {
  return sanitizeString(value, { field: "age_category", required: true, max: 80 });
}


function validateHomeVenue(home_venue) {
  if (home_venue === null || home_venue === undefined) return null;
  if (typeof home_venue !== "object" || Array.isArray(home_venue)) {
    throw new Error("invalid_home_venue");
  }

  for (const k of Object.keys(home_venue)) {
    if (!HOME_VENUE_KEYS.has(k)) throw new Error("invalid_home_venue");
    const v = home_venue[k];
    if (v === null || v === undefined) continue;
    if (typeof v !== "string") throw new Error("invalid_home_venue");
  }

  return home_venue;
}


router.post(
  "/:orgId/teams",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    if (!allowTeamsAdmin(req, orgId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const body = req.body || {};
    try {
      rejectUnknownFields(body, CREATE_FIELDS);
    } catch (e) {
      if (String(e.message || "").startsWith("unknown_field:")) {
        return res.status(400).json({ error: "bad_request", message: e.message });
      }
      return res.status(400).json({ error: "bad_request", message: "unknown_fields" });
    }

    let name;
    let season_label;
    let competition_level;
    let age_category;
    let sport;
    let season_year;

    const rawTeamLevel = body.team_level ?? body.competition_level ?? null;

    try {
      name = sanitizeString(body.name, { field: "name", required: true, max: 140 });
      season_label = normalizeSeasonLabel(body.season_label);
      if (!season_label) throw new Error("season_label_required");
      sport = normalizeSport(body.sport);
      competition_level = normalizeTeamLevel(rawTeamLevel);
      age_category = normalizeAgeGroup(body.age_category);
      season_year = deriveSeasonYear({ label: season_label, fallbackYear: body.season_year });
    } catch (err) {
      const message = err?.message || "bad_request";
      if (message === "invalid_season_year") {
        return res.status(400).json({ error: "invalid_season_year" });
      }
      return badRequest(res, message);
    }

    const home_venue = (() => {
      try {
        return validateHomeVenue(body.home_venue);
      } catch {
        return "__invalid__";
      }
    })();
    if (home_venue === "__invalid__") return res.status(400).json({ error: "invalid_home_venue" });

    let head_coach_user_id = null;
    try {
      head_coach_user_id = await validateHeadCoachAssignment({ orgId, headCoachUserId: body.head_coach_user_id ?? null });
    } catch (err) {
      return res.status(400).json({ error: err.message || "invalid_head_coach_user_id" });
    }

    const item = {
      orgId,
      name,
      season_year,
      season_label,
      sport,
      competition_level,
      age_category,
      head_coach_user_id,
      training_frequency_per_week: body.training_frequency_per_week ?? null,
      default_training_duration_min: body.default_training_duration_min ?? null,
      home_venue,
    };

    try {
      const created = await createTeam(item);
      return res.status(201).json({ item: created });
    } catch (err) {
      if (err && err.code === "23505") {
        if (err.constraint === "teams_org_season_name_unique" || err.constraint === "ux_teams_org_season_name") {
          return res.status(409).json({
            error: "team_already_exists",
            message: `A team named "${name}" already exists for this season.`,
          });
        }
        return res.status(409).json({ error: "team_already_exists" });
      }
      return res.status(500).json({ error: "create_team_failed", message: err.message });
    }
  }
);

router.get(
  "/:orgId/teams",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    if (!allowTeamsAdmin(req, orgId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    let includeArchived = false;
    try {
      includeArchived = parseBoolean(req.query.includeArchived, false);
    } catch {
      return res.status(400).json({ error: "invalid_include_archived" });
    }

    const items = await listTeams(orgId, { includeArchived });
    return res.status(200).json({ items });
  }
);

router.get(
  "/:orgId/coaches",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    if (!allowTeamsAdmin(req, orgId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    try {
      const coaches = await listCoachesByOrg(orgId);
      return res.status(200).json({ coaches });
    } catch (err) {
      return res.status(500).json({ error: "list_coaches_failed", message: err.message });
    }
  }
);

router.patch(
  "/:orgId/teams/:teamId",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const teamId = req.params.teamId;

    if (!allowTeamsAdmin(req, orgId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const body = req.body || {};
    try {
      rejectUnknownFields(body, PATCH_FIELDS);
    } catch (e) {
      if (String(e.message || "").startsWith("unknown_field:")) {
        return res.status(400).json({ error: "bad_request", message: e.message });
      }
      return res.status(400).json({ error: "bad_request", message: "unknown_fields" });
    }

    const hasTeamLevelField = Object.prototype.hasOwnProperty.call(body, "team_level");

    if (Object.prototype.hasOwnProperty.call(body, "home_venue")) {
      try {
        body.home_venue = validateHomeVenue(body.home_venue);
      } catch {
        return res.status(400).json({ error: "invalid_home_venue" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "head_coach_user_id")) {
      try {
        await validateHeadCoachAssignment({ orgId, headCoachUserId: body.head_coach_user_id });
      } catch (err) {
        return res.status(400).json({ error: err.message || "invalid_head_coach_user_id" });
      }
    }

    const hasSeasonYearField = Object.prototype.hasOwnProperty.call(body, "season_year");
    if (hasSeasonYearField) {
      const v = body.season_year;
      if (v === null) {
        body.season_year = null;
      } else if (!Number.isInteger(v) || v < 2000 || v > 2100) {
        return res.status(400).json({ error: "invalid_season_year" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "season_label")) {
      if (body.season_label === null) {
        body.season_label = null;
        if (!hasSeasonYearField) {
          body.season_year = null;
        }
      } else {
        try {
          const normalized = normalizeSeasonLabel(body.season_label);
          if (!normalized) throw new Error("season_label_required");
          body.season_label = normalized;
        } catch (err) {
          return badRequest(res, err.message || "invalid_season_label");
        }

        if (!hasSeasonYearField) {
          try {
            body.season_year = deriveSeasonYear({ label: body.season_label });
          } catch (err) {
            return res.status(400).json({ error: err.message || "invalid_season_year" });
          }
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "sport")) {
      if (body.sport === null) {
        body.sport = null;
      } else {
        try {
          body.sport = normalizeSport(body.sport);
        } catch (err) {
          return badRequest(res, err.message || "invalid_sport");
        }
      }
    }

    if (hasTeamLevelField) {
      if (body.team_level === null) {
        body.competition_level = null;
      } else {
        try {
          body.competition_level = normalizeTeamLevel(body.team_level);
        } catch (err) {
          return badRequest(res, err.message || "invalid_team_level");
        }
      }
      delete body.team_level;
    } else if (Object.prototype.hasOwnProperty.call(body, "competition_level")) {
      if (body.competition_level === null) {
        body.competition_level = null;
      } else {
        try {
          body.competition_level = normalizeTeamLevel(body.competition_level);
        } catch (err) {
          return badRequest(res, err.message || "invalid_team_level");
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "age_category")) {
      try {
        body.age_category = sanitizeString(body.age_category, {
          field: "age_category",
          required: false,
          max: 80,
        });
      } catch (err) {
        return badRequest(res, err.message || "invalid_age_category");
      }
    }

    try {
      const updated = await updateTeam(orgId, teamId, body);
      if (!updated) return res.status(404).json({ error: "team_not_found" });
      return res.status(200).json({ item: updated });
    } catch (err) {
      if (err && err.code === "23505") {
        if (err.constraint === "teams_org_season_name_unique" || err.constraint === "ux_teams_org_season_name") {
          return res.status(409).json({
            error: "team_already_exists",
            message: "A team with this name already exists for this season.",
          });
        }
        return res.status(409).json({ error: "team_already_exists" });
      }
      if (err && err.message === "no_updatable_fields") {
        return res.status(400).json({ error: "bad_request", message: "no_updatable_fields" });
      }
      return res.status(500).json({ error: "update_team_failed", message: err.message });
    }
  }
);

router.get(
  "/:orgId/teams/:teamId",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const teamId = req.params.teamId;

    if (!allowTeamsAdmin(req, orgId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const team = await getTeamById(orgId, teamId);
    if (!team) {
      return res.status(404).json({ error: "team_not_found" });
    }

    const club = await getOrganizationById(orgId);
    const headCoach = team.head_coach_user_id
      ? {
          id: team.head_coach_user_id,
          name: team.head_coach_name || null,
          email: team.head_coach_email || null,
        }
      : null;

    return res.status(200).json({
      team,
      club: club
        ? {
            id: club.id,
            name: club.name,
            slug: club.slug,
          }
        : null,
      headCoach,
      staff: headCoach ? [headCoach] : [],
    });
  }
);

router.get(
  "/:orgId/teams/:teamId/players",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const teamId = req.params.teamId;

    const team = await getTeamById(orgId, teamId);
    if (!team || team.is_archived) {
      return res.status(404).json({ error: "team_not_found" });
    }

    if (!allowTeamRosterAccess(req, orgId, teamId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    const players = await listPlayersByTeam(orgId, teamId);
    return res.status(200).json({
      team: {
        id: team.id,
        name: team.name,
      },
      players,
    });
  }
);

export default router;
