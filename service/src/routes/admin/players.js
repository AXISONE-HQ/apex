import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import {
  createPlayer,
  listPlayersByOrg,
  listUnassignedPlayersByOrg,
  getPlayerByIdAndOrg,
  updatePlayer,
  assignPlayerTeam,
  clearPlayerTeam,
  setPlayerStatus,
} from "../../repositories/playersRepo.js";
import {
  linkGuardianToPlayer,
  unlinkGuardianFromPlayer,
  listGuardiansByPlayer,
} from "../../repositories/guardianPlayersRepo.js";
import { listAttendanceByPlayer } from "../../repositories/playerAttendanceRepo.js";
import {
  createPlayerEvaluation,
  listEvaluationsByPlayer,
  getEvaluationByIdAndPlayer,
  updatePlayerEvaluation,
} from "../../repositories/playerEvaluationsRepo.js";
import { getEventById } from "../../repositories/eventsRepo.js";
import { getTeamById } from "../../repositories/teamsRepo.js";
import { getGuardianByIdAndOrg } from "../../repositories/guardiansRepo.js";

const router = Router({ mergeParams: true });

const POST_FIELDS = new Set([
  "first_name",
  "last_name",
  "display_name",
  "team_id",
  "jersey_number",
  "birth_year",
  "position",
  "status",
  "notes",
]);

const PATCH_FIELDS = POST_FIELDS;
const ASSIGN_FIELDS = new Set(["team_id"]);
const GUARDIAN_LINK_FIELDS = new Set(["guardian_id"]);
const EVALUATION_POST_FIELDS = new Set([
  "event_id",
  "title",
  "summary",
  "strengths",
  "improvements",
  "rating",
  "status",
]);
const EVALUATION_PATCH_FIELDS = EVALUATION_POST_FIELDS;

class TeamNotFoundError extends Error {
  constructor(message = "team_not_found") {
    super(message);
    this.name = "TeamNotFoundError";
  }
}

export function allowPlayersAdmin(req, orgId) {
  if (req.user?.isPlatformAdmin === true) return true;
  return (
    (req.user?.roles || []).includes("OrgAdmin") &&
    (req.user?.orgScopes || []).map(String).includes(String(orgId))
  );
}

function hasTeamScopedAccess(req, teamId) {
  if (!teamId) return false;
  const roles = new Set((req.user?.roles || []).map(String));
  const allowed = ["Coach", "AssistantCoach", "TeamManager"];
  const hasRole = allowed.some((role) => roles.has(role));
  if (!hasRole) return false;
  const scopes = (req.user?.teamScopes || []).map(String);
  return scopes.includes(String(teamId));
}

export function badRequest(res, message) {
  return res.status(400).json({ error: "bad_request", message });
}

export function forbidden(res) {
  return res.status(403).json({ error: "forbidden" });
}

function rejectUnknownFields(body, allowed) {
  const keys = Object.keys(body || {});
  for (const key of keys) {
    if (!allowed.has(key)) return key;
  }
  return null;
}

function sanitizeString(value, { required = false, max, field, allowNull = true }) {
  if (value === undefined) {
    if (required) throw new Error(`${field} is required`);
    return undefined;
  }
  if (value === null) {
    if (required) throw new Error(`${field} is required`);
    return null;
  }
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) throw new Error(`${field} is required`);
    return allowNull ? null : "";
  }
  if (max && trimmed.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return trimmed;
}

function sanitizeOptionalString(value, opts) {
  const result = sanitizeString(value, { ...opts, required: false });
  if (result === undefined) return undefined;
  if (result === "") return null;
  return result;
}

function sanitizeOptionalInt(value, { field, min, max }) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(num)) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  if (num < min || num > max) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  return num;
}

function sanitizeStatus(value) {
  if (value === undefined || value === null) return undefined;
  if (value !== "active" && value !== "inactive") {
    throw new Error("status must be one of: active, inactive");
  }
  return value;
}

function sanitizeEvaluationStatus(value) {
  if (value === undefined || value === null) return undefined;
  if (value !== "draft" && value !== "published") {
    throw new Error("status must be one of: draft, published");
  }
  return value;
}

function sanitizeRating(value) {
  if (value === undefined || value === null) return value === undefined ? undefined : null;
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new Error("rating must be an integer between 1 and 5");
  }
  return num;
}

async function validateTeam(orgId, teamId) {
  if (teamId === undefined) return undefined;
  if (teamId === null) return null;
  const team = await getTeamById(orgId, teamId);
  if (!team || team.is_archived) {
    throw new TeamNotFoundError();
  }
  return team.id;
}

function normalizePlayerRow(row) {
  return row;
}

router.post("/:orgId/players", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

  const unknown = rejectUnknownFields(req.body || {}, POST_FIELDS);
  if (unknown) return badRequest(res, `unknown field: ${unknown}`);

  try {
    const first_name = sanitizeString(req.body?.first_name, {
      required: true,
      max: 120,
      field: "first_name",
    });
    const last_name = sanitizeString(req.body?.last_name, {
      required: true,
      max: 120,
      field: "last_name",
    });
    const display_name = sanitizeOptionalString(req.body?.display_name, {
      field: "display_name",
      max: 120,
    });
    const position = sanitizeOptionalString(req.body?.position, {
      field: "position",
      max: 64,
    });
    const notes = sanitizeOptionalString(req.body?.notes, {
      field: "notes",
      max: 500,
    });
    const jersey_number = sanitizeOptionalInt(req.body?.jersey_number, {
      field: "jersey_number",
      min: 0,
      max: 99,
    });
    const currentYear = new Date().getUTCFullYear();
    const birth_year = sanitizeOptionalInt(req.body?.birth_year, {
      field: "birth_year",
      min: 1950,
      max: currentYear,
    });
    const status = sanitizeStatus(req.body?.status) ?? "active";
    const team_id = await validateTeam(orgId, req.body?.team_id);

    const player = await createPlayer({
      orgId,
      teamId: team_id ?? null,
      firstName: first_name,
      lastName: last_name,
      displayName: display_name ?? null,
      jerseyNumber: jersey_number ?? null,
      birthYear: birth_year ?? null,
      position: position ?? null,
      status,
      notes: notes ?? null,
    });

    return res.status(201).json({ item: normalizePlayerRow(player) });
  } catch (err) {
    if (err instanceof TeamNotFoundError) {
      return res.status(404).json({ error: "team_not_found" });
    }
    return badRequest(res, err.message || "bad_request");
  }
});

router.get("/:orgId/players/unassigned", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

  const players = await listUnassignedPlayersByOrg(orgId);
  return res.status(200).json({ players: players.map(normalizePlayerRow) });
});

router.post(
  "/:orgId/players/:playerId/activate",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const existing = await getPlayerByIdAndOrg(playerId, orgId);
    if (!existing) return res.status(404).json({ error: "player_not_found" });

    if (existing.status === "active") {
      return res.status(200).json({ player: normalizePlayerRow(existing) });
    }

    const updated = await setPlayerStatus(playerId, orgId, "active");
    if (!updated) return res.status(404).json({ error: "player_not_found" });

    return res.status(200).json({ player: normalizePlayerRow(updated) });
  }
);

router.post(
  "/:orgId/players/:playerId/deactivate",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const existing = await getPlayerByIdAndOrg(playerId, orgId);
    if (!existing) return res.status(404).json({ error: "player_not_found" });

    if (existing.status === "inactive") {
      return res.status(200).json({ player: normalizePlayerRow(existing) });
    }

    const updated = await setPlayerStatus(playerId, orgId, "inactive");
    if (!updated) return res.status(404).json({ error: "player_not_found" });

    return res.status(200).json({ player: normalizePlayerRow(updated) });
  }
);

router.post(
  "/:orgId/players/:playerId/guardians",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const unknown = rejectUnknownFields(req.body || {}, GUARDIAN_LINK_FIELDS);
    if (unknown) return badRequest(res, `unknown field: ${unknown}`);

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const guardianId = req.body?.guardian_id;
    if (!guardianId) {
      return badRequest(res, "guardian_id is required");
    }

    const guardian = await getGuardianByIdAndOrg(guardianId, orgId);
    if (!guardian) return res.status(404).json({ error: "guardian_not_found" });

    await linkGuardianToPlayer({ orgId, playerId, guardianId });
    return res.status(200).json({ ok: true });
  }
);

router.get(
  "/:orgId/players/:playerId/guardians",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const guardians = await listGuardiansByPlayer({ orgId, playerId });
    return res.status(200).json({ guardians });
  }
);

router.delete(
  "/:orgId/players/:playerId/guardians/:guardianId",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;
    const guardianId = req.params.guardianId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const guardian = await getGuardianByIdAndOrg(guardianId, orgId);
    if (!guardian) return res.status(404).json({ error: "guardian_not_found" });

    await unlinkGuardianFromPlayer({ orgId, playerId, guardianId });
    return res.status(200).json({ ok: true });
  }
);

router.get(
  "/:orgId/players/:playerId/attendance",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const attendance = await listAttendanceByPlayer({ orgId, playerId });
    return res.status(200).json({ attendance });
  }
);

router.post(
  "/:orgId/players/:playerId/evaluations",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const unknown = rejectUnknownFields(req.body || {}, EVALUATION_POST_FIELDS);
    if (unknown) return badRequest(res, `unknown field: ${unknown}`);

    try {
      const title = sanitizeString(req.body?.title, {
        required: true,
        max: 160,
        field: "title",
      });
      const summary = sanitizeOptionalString(req.body?.summary, {
        field: "summary",
        max: 1000,
      });
      const strengths = sanitizeOptionalString(req.body?.strengths, {
        field: "strengths",
        max: 1000,
      });
      const improvements = sanitizeOptionalString(req.body?.improvements, {
        field: "improvements",
        max: 1000,
      });
      const rating = sanitizeRating(req.body?.rating);
      const status = sanitizeEvaluationStatus(req.body?.status) ?? "published";
      const eventId = req.body?.event_id ?? null;

      if (eventId) {
        const event = await getEventById({ id: eventId, orgId });
        if (!event) return res.status(404).json({ error: "event_not_found" });
      }

      const evaluation = await createPlayerEvaluation({
        orgId,
        playerId,
        eventId: eventId ?? null,
        authorUserId: req.user?.id ?? null,
        title,
        summary: summary ?? null,
        strengths: strengths ?? null,
        improvements: improvements ?? null,
        rating: rating ?? null,
        status,
      });

      return res.status(201).json({ evaluation });
    } catch (err) {
      return badRequest(res, err.message || "bad_request");
    }
  }
);

router.get(
  "/:orgId/players/:playerId/evaluations",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const evaluations = await listEvaluationsByPlayer({ orgId, playerId });
    return res.status(200).json({ evaluations });
  }
);

router.patch(
  "/:orgId/players/:playerId/evaluations/:evaluationId",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;
    const evaluationId = req.params.evaluationId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const unknown = rejectUnknownFields(req.body || {}, EVALUATION_PATCH_FIELDS);
    if (unknown) return badRequest(res, `unknown field: ${unknown}`);

    if (!req.body || Object.keys(req.body).length === 0) {
      return badRequest(res, "request body must include at least one allowed field");
    }

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const existing = await getEvaluationByIdAndPlayer({ evaluationId, playerId, orgId });
    if (!existing) return res.status(404).json({ error: "evaluation_not_found" });

    try {
      const patch = {};
      if ("title" in req.body) {
        const title = sanitizeString(req.body.title, {
          required: false,
          max: 160,
          field: "title",
        });
        if (title === null) throw new Error("title is required");
        if (title !== undefined) patch.title = title;
      }
      if ("summary" in req.body) {
        patch.summary = sanitizeOptionalString(req.body.summary, {
          field: "summary",
          max: 1000,
        }) ?? null;
      }
      if ("strengths" in req.body) {
        patch.strengths = sanitizeOptionalString(req.body.strengths, {
          field: "strengths",
          max: 1000,
        }) ?? null;
      }
      if ("improvements" in req.body) {
        patch.improvements = sanitizeOptionalString(req.body.improvements, {
          field: "improvements",
          max: 1000,
        }) ?? null;
      }
      if ("rating" in req.body) {
        patch.rating = sanitizeRating(req.body.rating) ?? null;
      }
      if ("status" in req.body) {
        patch.status = sanitizeEvaluationStatus(req.body.status);
      }
      if ("event_id" in req.body) {
        const eventId = req.body.event_id;
        if (eventId === null) {
          patch.event_id = null;
        } else {
          const event = await getEventById({ id: eventId, orgId });
          if (!event) return res.status(404).json({ error: "event_not_found" });
          patch.event_id = eventId;
        }
      }

      if (Object.keys(patch).length === 0) {
        return badRequest(res, "request body must include at least one allowed field");
      }

      const updated = await updatePlayerEvaluation({ evaluationId, playerId, orgId, patch });
      if (!updated) return res.status(404).json({ error: "evaluation_not_found" });

      return res.status(200).json({ evaluation: updated });
    } catch (err) {
      return badRequest(res, err.message || "bad_request");
    }
  }
);

router.get("/:orgId/players/:playerId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const playerId = req.params.playerId;

  const player = await getPlayerByIdAndOrg(playerId, orgId);
  if (!player) return res.status(404).json({ error: "player_not_found" });

  const isAuthorized = allowPlayersAdmin(req, orgId) || hasTeamScopedAccess(req, player.team_id);
  if (!isAuthorized) return forbidden(res);

  let team = null;
  if (player.team_id) {
    const teamRecord = await getTeamById(orgId, player.team_id);
    if (teamRecord && !teamRecord.is_archived) {
      team = { id: teamRecord.id, name: teamRecord.name };
    }
  }

  return res.status(200).json({ player: normalizePlayerRow(player), team });
});

router.get("/:orgId/players", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

  const statusFilter = (req.query.status || "active").toLowerCase();
  if (!["active", "inactive", "all"].includes(statusFilter)) {
    return badRequest(res, "status must be one of: active, inactive, all");
  }

  const teamFilter = req.query.teamId ? String(req.query.teamId) : null;

  const players = await listPlayersByOrg(orgId);
  const filtered = players.filter((player) => {
    if (statusFilter !== "all" && player.status !== statusFilter) return false;
    if (teamFilter && String(player.team_id) !== teamFilter) return false;
    return true;
  });

  return res.status(200).json({ items: filtered.map(normalizePlayerRow) });
});

router.patch(
  "/:orgId/players/:playerId",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;
    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const unknown = rejectUnknownFields(req.body || {}, PATCH_FIELDS);
    if (unknown) return badRequest(res, `unknown field: ${unknown}`);

    if (!req.body || Object.keys(req.body).length === 0) {
      return badRequest(res, "request body must include at least one allowed field");
    }

    const existing = await getPlayerByIdAndOrg(playerId, orgId);
    if (!existing) return res.status(404).json({ error: "player_not_found" });

    try {
      const patch = {};
      if ("first_name" in req.body) {
        const val = sanitizeString(req.body.first_name, {
          required: false,
          max: 120,
          field: "first_name",
        });
        if (val === null) throw new Error("first_name is required");
        if (val !== undefined) patch.first_name = val;
      }
      if ("last_name" in req.body) {
        const val = sanitizeString(req.body.last_name, {
          required: false,
          max: 120,
          field: "last_name",
        });
        if (val === null) throw new Error("last_name is required");
        if (val !== undefined) patch.last_name = val;
      }
      if ("display_name" in req.body) {
        patch.display_name = sanitizeOptionalString(req.body.display_name, {
          field: "display_name",
          max: 120,
        }) ?? null;
      }
      if ("position" in req.body) {
        patch.position = sanitizeOptionalString(req.body.position, {
          field: "position",
          max: 64,
        }) ?? null;
      }
      if ("notes" in req.body) {
        patch.notes = sanitizeOptionalString(req.body.notes, {
          field: "notes",
          max: 500,
        }) ?? null;
      }
      if ("jersey_number" in req.body) {
        patch.jersey_number = sanitizeOptionalInt(req.body.jersey_number, {
          field: "jersey_number",
          min: 0,
          max: 99,
        });
      }
      if ("birth_year" in req.body) {
        const currentYear = new Date().getUTCFullYear();
        patch.birth_year = sanitizeOptionalInt(req.body.birth_year, {
          field: "birth_year",
          min: 1950,
          max: currentYear,
        });
      }
      if ("status" in req.body) {
        patch.status = sanitizeStatus(req.body.status);
      }
      if ("team_id" in req.body) {
        patch.team_id = await validateTeam(orgId, req.body.team_id);
      }

      if (Object.keys(patch).length === 0) {
        return badRequest(res, "request body must include at least one allowed field");
      }

      const updated = await updatePlayer(playerId, orgId, patch);
      if (!updated) return res.status(404).json({ error: "player_not_found" });

      return res.status(200).json({ item: normalizePlayerRow(updated) });
    } catch (err) {
      if (err instanceof TeamNotFoundError) {
        return res.status(404).json({ error: "team_not_found" });
      }
      return badRequest(res, err.message || "bad_request");
    }
  }
);

router.post(
  "/:orgId/players/:playerId/team",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const unknown = rejectUnknownFields(req.body || {}, ASSIGN_FIELDS);
    if (unknown) return badRequest(res, `unknown field: ${unknown}`);

    if (!req.body || req.body.team_id === undefined || req.body.team_id === null) {
      return badRequest(res, "team_id is required");
    }

    const existing = await getPlayerByIdAndOrg(playerId, orgId);
    if (!existing) return res.status(404).json({ error: "player_not_found" });

    try {
      const teamId = await validateTeam(orgId, req.body.team_id);

      const sameTeam =
        existing.team_id !== null &&
        existing.team_id !== undefined &&
        teamId !== null &&
        teamId !== undefined &&
        String(existing.team_id) === String(teamId);

      if (sameTeam) {
        return res.status(200).json({ player: normalizePlayerRow(existing) });
      }

      const updated = await assignPlayerTeam(playerId, orgId, teamId);
      if (!updated) return res.status(404).json({ error: "player_not_found" });

      return res.status(200).json({ player: normalizePlayerRow(updated) });
    } catch (err) {
      if (err instanceof TeamNotFoundError) {
        return res.status(404).json({ error: "team_not_found" });
      }
      return badRequest(res, err.message || "bad_request");
    }
  }
);

router.delete(
  "/:orgId/players/:playerId/team",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const playerId = req.params.playerId;

    if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

    const existing = await getPlayerByIdAndOrg(playerId, orgId);
    if (!existing) return res.status(404).json({ error: "player_not_found" });

    if (existing.team_id === null || existing.team_id === undefined) {
      return res.status(200).json({ player: normalizePlayerRow(existing) });
    }

    const updated = await clearPlayerTeam(playerId, orgId);
    if (!updated) return res.status(404).json({ error: "player_not_found" });

    return res.status(200).json({ player: normalizePlayerRow(updated) });
  }
);

export default router;
