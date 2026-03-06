import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { badRequest } from "../domain/_helpers.js";
import {
  createTeam,
  getTeamById,
  listTeams,
  updateTeam,
} from "../../repositories/teamsRepo.js";
import { query } from "../../db/client.js";
import { getMembershipByOrgAndUserId } from "../../repositories/membershipsRepo.js";

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
  "competition_level",
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

function allowTeamsAdmin(req, orgId) {
  if (req.user?.isPlatformAdmin === true) return true;
  return (
    (req.user?.roles || []).includes("OrgAdmin") &&
    (req.user?.orgScopes || []).map(String).includes(String(orgId))
  );
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

async function validateHeadCoach({ orgId, headCoachUserId }) {
  if (headCoachUserId === null || headCoachUserId === undefined) return null;

  // Verify user exists
  const userRes = await query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [headCoachUserId]);
  if (!userRes.rows.length) {
    throw new Error("head_coach_not_found");
  }

  // Verify membership + role (canonical repo lookup)
  const membership = await getMembershipByOrgAndUserId({ orgId, userId: headCoachUserId });
  if (!membership) throw new Error("head_coach_not_member");

  const roleCode = String(membership.roleCode || "");
  if (!["ManagerCoach", "OrgAdmin"].includes(roleCode)) {
    throw new Error("head_coach_role_not_allowed");
  }

  return headCoachUserId;
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

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest(res, "name required");

    const season_year = body.season_year;
    if (!Number.isInteger(season_year) || season_year < 2000 || season_year > 2100) {
      return res.status(400).json({ error: "invalid_season_year" });
    }

    const home_venue = (() => {
      try {
        return validateHomeVenue(body.home_venue);
      } catch {
        return "__invalid__";
      }
    })();
    if (home_venue === "__invalid__") return res.status(400).json({ error: "invalid_home_venue" });

    let head_coach_user_id = body.head_coach_user_id ?? null;
    if (head_coach_user_id !== null && typeof head_coach_user_id !== "string") {
      return res.status(400).json({ error: "invalid_head_coach_user_id" });
    }

    try {
      head_coach_user_id = await validateHeadCoach({ orgId, headCoachUserId: head_coach_user_id });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const item = {
      orgId,
      name,
      season_year,
      competition_level: body.competition_level ?? null,
      age_category: body.age_category ?? null,
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

    if (Object.prototype.hasOwnProperty.call(body, "home_venue")) {
      try {
        body.home_venue = validateHomeVenue(body.home_venue);
      } catch {
        return res.status(400).json({ error: "invalid_home_venue" });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "head_coach_user_id")) {
      const v = body.head_coach_user_id;
      if (v !== null && typeof v !== "string") {
        return res.status(400).json({ error: "invalid_head_coach_user_id" });
      }
      try {
        await validateHeadCoach({ orgId, headCoachUserId: v });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    try {
      const updated = await updateTeam(orgId, teamId, body);
      if (!updated) return res.status(404).json({ error: "team_not_found" });
      return res.status(200).json({ item: updated });
    } catch (err) {
      if (err && err.code === "23505") {
        return res.status(409).json({ error: "team_already_exists" });
      }
      if (err && err.message === "no_updatable_fields") {
        return res.status(400).json({ error: "bad_request", message: "no_updatable_fields" });
      }
      return res.status(500).json({ error: "update_team_failed", message: err.message });
    }
  }
);

export default router;
