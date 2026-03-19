import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { allowPlayersAdmin, badRequest, forbidden } from "./players.js";
import { getPlayerByIdAndOrg, listPlayersByTeam } from "../../repositories/playersRepo.js";
import { createEvent, getEventById, listEvents } from "../../repositories/eventsRepo.js";
import { getTeamById } from "../../repositories/teamsRepo.js";
import {
  upsertPlayerAttendance,
  listAttendanceByEvent,
} from "../../repositories/playerAttendanceRepo.js";
import { eventNotifications } from "../../services/eventNotifications.js";
import { eventCalendarSync } from "../../services/eventCalendarSync.js";

const router = Router({ mergeParams: true });

const EVENT_TYPES = new Set(["practice", "game", "event"]);
const CREATE_FIELDS = new Set([
  "team_id",
  "type",
  "title",
  "starts_at",
  "ends_at",
  "location",
  "notes",
  "opponent_name",
  "location_type",
  "game_type",
  "uniform_color",
  "arrival_time",
]);
const GAME_FIELDS = new Set([
  "opponent_name",
  "location_type",
  "game_type",
  "uniform_color",
  "arrival_time",
]);
const ATTENDANCE_FIELDS = new Set(["player_id", "status", "notes"]);

function rejectUnknownFields(body, allowed) {
  const keys = Object.keys(body || {});
  for (const key of keys) {
    if (!allowed.has(key)) return key;
  }
  return null;
}

function requireAdminAccess(req, res, orgId) {
  if (!allowPlayersAdmin(req, orgId)) {
    forbidden(res);
    return false;
  }
  return true;
}

function sanitizeString(value, { field, required = false, max = 255 }) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required`);
    return value === undefined ? undefined : null;
  }
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new Error(`${field} is required`);
    return null;
  }
  if (trimmed.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return trimmed;
}

function sanitizeType(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("type is required");
  }
  const normalized = value.trim();
  if (!EVENT_TYPES.has(normalized)) {
    throw new Error("type must be one of: practice, game, event");
  }
  return normalized;
}

function parseDate(value, { field, required = false }) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required`);
    return null;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be an ISO-8601 string`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be an ISO-8601 string`);
  }
  return date.toISOString();
}

function sanitizeLocationType(value) {
  const normalized = sanitizeString(value, { field: "location_type", required: true }).toLowerCase();
  if (!["home", "away"].includes(normalized)) {
    throw new Error("location_type must be one of: home, away");
  }
  return normalized;
}

function sanitizeGameType(value) {
  const normalized = sanitizeString(value, { field: "game_type", required: true }).toLowerCase();
  if (!["league", "friendly", "tournament"].includes(normalized)) {
    throw new Error("game_type must be one of: league, friendly, tournament");
  }
  return normalized;
}

function sanitizeUniformColor(value) {
  const sanitized = sanitizeString(value, { field: "uniform_color", required: false, max: 120 });
  if (sanitized === undefined) return undefined;
  return sanitized;
}

function sanitizeGamePayload(type, body) {
  const hasAnyGameField = Array.from(GAME_FIELDS).some((field) => body?.[field] !== undefined);
  if (type !== "game") {
    if (hasAnyGameField) {
      throw new Error("game-specific fields are only allowed when type is game");
    }
    return null;
  }

  const opponent_name = sanitizeString(body?.opponent_name, { field: "opponent_name", required: true, max: 160 });
  const location_type = sanitizeLocationType(body?.location_type);
  const game_type = sanitizeGameType(body?.game_type);
  const uniform_color = sanitizeUniformColor(body?.uniform_color);
  const arrival_time_raw = body?.arrival_time;
  const arrival_time = arrival_time_raw === undefined ? null : parseDate(arrival_time_raw, { field: "arrival_time" });

  return {
    opponent_name,
    location_type,
    game_type,
    uniform_color: uniform_color ?? null,
    arrival_time,
  };
}

function serializeEvent(row) {
  const event = {
    id: row.id,
    org_id: row.org_id ?? row.orgId,
    team_id: row.team_id ?? row.teamId,
    title: row.title,
    type: row.type,
    starts_at: row.starts_at ?? row.startsAt,
    ends_at: row.ends_at ?? row.endsAt,
    location: row.location ?? null,
    notes: row.notes ?? null,
    created_by: row.created_by ?? row.createdBy ?? null,
    created_at: row.created_at ?? row.createdAt,
    updated_at: row.updated_at ?? row.updatedAt,
  };

  const gameOpponent = row.game_opponent_name ?? row.game?.opponent_name ?? null;
  const gameLocation = row.game_location_type ?? row.game?.location_type ?? null;
  const gameType = row.game_game_type ?? row.game?.game_type ?? null;
  const gameUniform = row.game_uniform_color ?? row.game?.uniform_color ?? null;
  const gameArrival = row.game_arrival_time ?? row.game?.arrival_time ?? null;

  if (row.type === "game" && gameOpponent && gameLocation && gameType) {
    event.game = {
      opponent_name: gameOpponent,
      location_type: gameLocation,
      game_type: gameType,
      uniform_color: gameUniform,
      arrival_time: gameArrival,
    };
  }

  return event;
}

async function loadEventOr404({ orgId, eventId, res }) {
  const event = await getEventById({ id: eventId, orgId });
  if (!event) {
    res.status(404).json({ error: "event_not_found" });
    return null;
  }
  return event;
}

router.post("/:orgId/events", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!requireAdminAccess(req, res, orgId)) return;

  const requestDebug = {
    orgId,
    userId: req.user?.id ?? null,
    teamId: req.body?.team_id ?? null,
    type: req.body?.type ?? null,
    title: req.body?.title ?? null,
  };
  console.log("[events.create] entry", requestDebug);

  const unknown = rejectUnknownFields(req.body || {}, CREATE_FIELDS);
  if (unknown) {
    console.log("[events.create] unknown field rejected", { orgId, unknownField: unknown });
    return badRequest(res, `unknown field: ${unknown}`);
  }

  try {
    const teamId = req.body?.team_id;
    if (!teamId) throw new Error("team_id is required");

    console.log("[events.create] raw payload summary", {
      orgId,
      teamId,
      type: req.body?.type ?? null,
      starts_at: req.body?.starts_at ?? null,
      ends_at: req.body?.ends_at ?? null,
    });

    const title = sanitizeString(req.body?.title, { field: "title", required: true, max: 160 });
    const type = sanitizeType(req.body?.type);
    const startsAt = parseDate(req.body?.starts_at, { field: "starts_at", required: true });
    const endsAt = parseDate(req.body?.ends_at, { field: "ends_at", required: true });
    if (endsAt <= startsAt) {
      throw new Error("ends_at must be later than starts_at");
    }
    const location = sanitizeString(req.body?.location, { field: "location", required: false, max: 255 });
    const notes = sanitizeString(req.body?.notes, { field: "notes", required: false, max: 500 });
    const gameDetails = sanitizeGamePayload(type, req.body);

    console.log("[events.create] normalized payload", {
      orgId,
      teamId,
      type,
      title,
      startsAt,
      endsAt,
      hasGameDetails: Boolean(gameDetails),
    });

    const team = await getTeamById(orgId, teamId);
    console.log("[events.create] team lookup result", {
      orgId,
      requestedTeamId: teamId,
      foundTeamId: team?.id ?? null,
      teamOrgId: team?.org_id ?? team?.orgId ?? null,
      isArchived: team?.is_archived ?? null,
    });
    if (!team || team.is_archived) {
      console.log("[events.create] team not found or archived", { orgId, requestedTeamId: teamId });
      return res.status(404).json({ error: "team_not_found" });
    }

    console.log("[events.create] invoking createEvent", { orgId, teamId: team.id, type });
    const event = await createEvent({
      orgId,
      teamId: team.id,
      title,
      type,
      startsAt,
      endsAt,
      location: location ?? null,
      notes: notes ?? null,
      createdBy: req.user?.id ?? null,
      gameDetails,
    });
    console.log("[events.create] event created", { orgId, eventId: event.id, teamId: event.team_id ?? event.teamId ?? team.id });

    try {
      await eventNotifications.notifyEventCreated({
        orgId,
        event,
        actorUserId: req.user?.id ?? null,
      });
    } catch (err) {
      console.error("event notification failed", err);
    }

    try {
      await eventCalendarSync.syncEventCreated({
        orgId,
        event,
        actorUserId: req.user?.id ?? null,
      });
    } catch (err) {
      console.error("event calendar sync failed", err);
    }

    return res.status(201).json({ event: serializeEvent(event) });
  } catch (err) {
    console.error("[events.create] error", {
      orgId: req.params.orgId,
      requestedTeamId: req.body?.team_id ?? null,
      message: err.message,
    });
    return badRequest(res, err.message || "bad_request");
  }
});

router.get("/:orgId/events", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!requireAdminAccess(req, res, orgId)) return;

  try {
    const filters = {};
    if (req.query.team_id) {
      filters.teamId = req.query.team_id;
    }
    if (req.query.from) {
      filters.from = parseDate(req.query.from, { field: "from", required: true });
    }
    if (req.query.to) {
      filters.to = parseDate(req.query.to, { field: "to", required: true });
    }

    const events = await listEvents({ orgId, ...filters });
    return res.status(200).json({ items: events.map(serializeEvent) });
  } catch (err) {
    return badRequest(res, err.message || "bad_request");
  }
});

router.get("/:orgId/events/:eventId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!requireAdminAccess(req, res, orgId)) return;

  const event = await loadEventOr404({ orgId, eventId: req.params.eventId, res });
  if (!event) return;
  return res.status(200).json({ event: serializeEvent(event) });
});

router.get("/:orgId/events/:eventId/attendance/summary", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const eventId = req.params.eventId;

  if (!requireAdminAccess(req, res, orgId)) return;

  const event = await loadEventOr404({ orgId, eventId, res });
  if (!event) return;

  const teamId = event.team_id ?? event.teamId ?? null;
  let totalPlayers = 0;
  let rosterIds = new Set();

  if (teamId) {
    const roster = await listPlayersByTeam(orgId, teamId);
    const activeRoster = roster.filter((player) => (player.status ?? "active") !== "inactive");
    totalPlayers = activeRoster.length;
    rosterIds = new Set(activeRoster.map((p) => String(p.id)));
  }

  const attendanceRows = await listAttendanceByEvent({ orgId, eventId });
  const counts = { yes: 0, no: 0, late: 0, excused: 0 };

  for (const row of attendanceRows) {
    const playerId = String(row.player_id ?? row.playerId ?? "");
    if (!rosterIds.has(playerId)) continue;
    switch (row.status) {
      case "present":
        counts.yes += 1;
        break;
      case "absent":
        counts.no += 1;
        break;
      case "late":
        counts.late += 1;
        break;
      case "excused":
        counts.excused += 1;
        break;
      default:
        break;
    }
  }

  const responded = counts.yes + counts.no + counts.late + counts.excused;
  const noResponse = totalPlayers > responded ? totalPlayers - responded : 0;

  return res.status(200).json({
    summary: {
      event_id: event.id,
      team_id: teamId,
      total_players: totalPlayers,
      yes: counts.yes,
      no: counts.no,
      late: counts.late,
      excused: counts.excused,
      no_response: noResponse,
    },
  });
});

function normalizeAttendanceStatus(value) {
  if (!value || typeof value !== "string") {
    throw new Error("status must be one of: yes, no, late, present, absent, excused");
  }
  const normalized = value.toLowerCase();
  if (normalized === "yes") return "present";
  if (normalized === "no") return "absent";
  if (normalized === "late") return "late";
  if (["present", "absent", "excused"].includes(normalized)) return normalized;
  throw new Error("status must be one of: yes, no, late, present, absent, excused");
}

function sanitizeNotes(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("notes must be a string");
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) throw new Error("notes must be at most 500 characters");
  return trimmed;
}

router.post("/:orgId/events/:eventId/attendance", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const eventId = req.params.eventId;

  if (!requireAdminAccess(req, res, orgId)) return;

  const unknown = rejectUnknownFields(req.body || {}, ATTENDANCE_FIELDS);
  if (unknown) return badRequest(res, `unknown field: ${unknown}`);

  const playerId = req.body?.player_id;
  if (!playerId) {
    return badRequest(res, "player_id is required");
  }

  try {
    const status = normalizeAttendanceStatus(req.body?.status);
    const notes = sanitizeNotes(req.body?.notes);

    const event = await loadEventOr404({ orgId, eventId, res });
    if (!event) return;

    const player = await getPlayerByIdAndOrg(playerId, orgId);
    if (!player) return res.status(404).json({ error: "player_not_found" });

    const attendance = await upsertPlayerAttendance({
      orgId,
      eventId,
      playerId,
      status,
      notes: notes ?? null,
      recordedBy: req.user?.id ?? null,
    });

    return res.status(200).json({ attendance });
  } catch (err) {
    return badRequest(res, err.message || "bad_request");
  }
});

router.get("/:orgId/events/:eventId/attendance", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const eventId = req.params.eventId;

  if (!requireAdminAccess(req, res, orgId)) return;

  const event = await loadEventOr404({ orgId, eventId, res });
  if (!event) return;

  const attendance = await listAttendanceByEvent({ orgId, eventId });
  return res.status(200).json({ attendance });
});

export { serializeEvent, parseDate };
export default router;
