import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import {
  createGuardian,
  listGuardiansByOrg,
  getGuardianByIdAndOrg,
  updateGuardian,
  findGuardianByEmail,
} from "../../repositories/guardiansRepo.js";
import { listPlayersByGuardian } from "../../repositories/guardianPlayersRepo.js";
import { listEvents, getEventById } from "../../repositories/eventsRepo.js";
import {
  upsertPlayerAttendance,
  listAttendanceByEvent,
} from "../../repositories/playerAttendanceRepo.js";
import { serializeEvent, parseDate } from "./events.js";

const router = Router({ mergeParams: true });

const CREATE_FIELDS = new Set([
  "first_name",
  "last_name",
  "display_name",
  "email",
  "phone",
  "relationship",
  "status",
  "notes",
]);

const PATCH_FIELDS = CREATE_FIELDS;

async function ensureUniqueEmail({ orgId, email, guardianId = null }) {
  if (!email) return;
  const normalized = email.toLowerCase();
  const existing = await findGuardianByEmail(orgId, normalized);
  if (!existing) return;
  if (guardianId && existing.id === guardianId) return;
  throw new Error("guardian email already exists in this organization");
}

function allowGuardiansAdmin(req, orgId) {
  if (req.user?.isPlatformAdmin === true) return true;
  return (
    (req.user?.roles || []).includes("OrgAdmin") &&
    (req.user?.orgScopes || []).map(String).includes(String(orgId))
  );
}

function badRequest(res, message) {
  return res.status(400).json({ error: "bad_request", message });
}

function forbidden(res) {
  return res.status(403).json({ error: "forbidden" });
}

function rejectUnknownFields(body, allowed) {
  const keys = Object.keys(body || {});
  for (const key of keys) {
    if (!allowed.has(key)) return key;
  }
  return null;
}

function sanitizeString(value, { field, required = false, max, allowNull = true }) {
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

function normalizeEmail(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("email must be a string");
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("invalid email format");
  }
  return trimmed.toLowerCase();
}

function sanitizeEmail(value) {
  return normalizeEmail(value);
}

function normalizeGuardianStatus(value) {
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

function toGuardianDisplayStatus(status) {
  switch (status) {
    case "present":
      return "yes";
    case "absent":
      return "no";
    case "late":
      return "late";
    case "excused":
      return "excused";
    default:
      return null;
  }
}

function sanitizeGuardianNotes(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("notes must be a string");
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 500) throw new Error("notes must be at most 500 characters");
  return trimmed;
}

function ensureEventHasTeam(event) {
  const teamId = event.team_id ?? event.teamId ?? null;
  if (!teamId) return null;
  return teamId;
}

async function requireGuardian(req, res, orgId, guardianId) {
  const guardian = await getGuardianByIdAndOrg(guardianId, orgId);
  if (!guardian) {
    res.status(404).json({ error: "guardian_not_found" });
    return null;
  }
  return guardian;
}

async function requireEvent(req, res, orgId, eventId) {
  const event = await getEventById({ id: eventId, orgId });
  if (!event) {
    res.status(404).json({ error: "event_not_found" });
    return null;
  }
  return event;
}

function eligiblePlayersForEvent(linkedPlayers, teamId) {
  const teamKey = String(teamId);
  return linkedPlayers.filter((player) => {
    const isActive = (player.status ?? "active") !== "inactive";
    const playerTeamId = player.team_id ?? player.teamId ?? null;
    return isActive && playerTeamId && String(playerTeamId) === teamKey;
  });
}

function formatGuardianAttendanceResponse({ attendanceRow, guardianId }) {
  if (!attendanceRow) return null;
  const eventId = attendanceRow.event_id ?? attendanceRow.eventId ?? null;
  const playerId = attendanceRow.player_id ?? attendanceRow.playerId ?? null;
  const status = attendanceRow.status ?? null;
  return {
    event_id: eventId,
    player_id: playerId,
    guardian_id: guardianId,
    status,
    notes: attendanceRow.notes ?? null,
    rsvp_status: status ? toGuardianDisplayStatus(status) : null,
    updated_at: attendanceRow.updated_at ?? attendanceRow.updatedAt ?? null,
  };
}

function sanitizeStatus(value) {
  if (value === undefined || value === null) return undefined;
  if (value !== "active" && value !== "inactive") {
    throw new Error("status must be one of: active, inactive");
  }
  return value;
}

function normalizeGuardian(row) {
  return row;
}

router.post("/:orgId/guardians", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowGuardiansAdmin(req, orgId)) return forbidden(res);

  const unknown = rejectUnknownFields(req.body || {}, CREATE_FIELDS);
  if (unknown) return badRequest(res, `unknown field: ${unknown}`);

  try {
    const first_name = sanitizeString(req.body?.first_name, {
      field: "first_name",
      required: true,
      max: 120,
    });
    const last_name = sanitizeString(req.body?.last_name, {
      field: "last_name",
      required: true,
      max: 120,
    });
    const display_name = sanitizeOptionalString(req.body?.display_name, {
      field: "display_name",
      max: 120,
    });
    const email = sanitizeEmail(req.body?.email);
    await ensureUniqueEmail({ orgId, email });
    const phone = sanitizeOptionalString(req.body?.phone, {
      field: "phone",
      max: 50,
    });
    const relationship = sanitizeOptionalString(req.body?.relationship, {
      field: "relationship",
      max: 80,
    });
    const notes = sanitizeOptionalString(req.body?.notes, {
      field: "notes",
      max: 500,
    });
    const status = sanitizeStatus(req.body?.status) ?? "active";

    const guardian = await createGuardian({
      orgId,
      firstName: first_name,
      lastName: last_name,
      displayName: display_name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      relationship: relationship ?? null,
      status,
      notes: notes ?? null,
    });

    return res.status(201).json({ guardian: normalizeGuardian(guardian) });
  } catch (err) {
    return badRequest(res, err.message || "bad_request");
  }
});

router.get("/:orgId/guardians", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowGuardiansAdmin(req, orgId)) return forbidden(res);

  const guardians = await listGuardiansByOrg(orgId);
  return res
    .status(200)
    .json({ guardians: guardians.map((g) => normalizeGuardian(g)) });
});

router.patch("/:orgId/guardians/:guardianId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const guardianId = req.params.guardianId;

  if (!allowGuardiansAdmin(req, orgId)) return forbidden(res);

  const unknown = rejectUnknownFields(req.body || {}, PATCH_FIELDS);
  if (unknown) return badRequest(res, `unknown field: ${unknown}`);

  if (!req.body || Object.keys(req.body).length === 0) {
    return badRequest(res, "request body must include at least one allowed field");
  }

  const existing = await getGuardianByIdAndOrg(guardianId, orgId);
  if (!existing) return res.status(404).json({ error: "guardian_not_found" });

  try {
    const patch = {};

    if ("first_name" in req.body) {
      const val = sanitizeString(req.body.first_name, {
        field: "first_name",
        required: false,
        max: 120,
      });
      if (val === null) throw new Error("first_name is required");
      if (val !== undefined) patch.first_name = val;
    }

    if ("last_name" in req.body) {
      const val = sanitizeString(req.body.last_name, {
        field: "last_name",
        required: false,
        max: 120,
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

    if ("email" in req.body) {
      const normalizedEmail = sanitizeEmail(req.body.email) ?? null;
      await ensureUniqueEmail({ orgId, email: normalizedEmail, guardianId });
      patch.email = normalizedEmail;
    }

    if ("phone" in req.body) {
      patch.phone = sanitizeOptionalString(req.body.phone, {
        field: "phone",
        max: 50,
      }) ?? null;
    }

    if ("relationship" in req.body) {
      patch.relationship = sanitizeOptionalString(req.body.relationship, {
        field: "relationship",
        max: 80,
      }) ?? null;
    }

    if ("notes" in req.body) {
      patch.notes = sanitizeOptionalString(req.body.notes, {
        field: "notes",
        max: 500,
      }) ?? null;
    }

    if ("status" in req.body) {
      patch.status = sanitizeStatus(req.body.status);
    }

    if (Object.keys(patch).length === 0) {
      return badRequest(res, "request body must include at least one allowed field");
    }

    const updated = await updateGuardian(guardianId, orgId, patch);
    if (!updated) return res.status(404).json({ error: "guardian_not_found" });

    return res.status(200).json({ guardian: normalizeGuardian(updated) });
  } catch (err) {
    return badRequest(res, err.message || "bad_request");
  }
});

router.get(
  "/:orgId/guardians/:guardianId/players",
  requireSession,
  async (req, res) => {
    const orgId = req.params.orgId;
    const guardianId = req.params.guardianId;

    if (!allowGuardiansAdmin(req, orgId)) return forbidden(res);

    const guardian = await getGuardianByIdAndOrg(guardianId, orgId);
    if (!guardian) return res.status(404).json({ error: "guardian_not_found" });

    const players = await listPlayersByGuardian({ orgId, guardianId });
    return res.status(200).json({
      players: players.map((p) => ({ ...p, linked_at: p.linked_at ?? null })),
    });
  }
);

router.get("/:orgId/guardians/:guardianId/events", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const guardianId = req.params.guardianId;

  if (!allowGuardiansAdmin(req, orgId)) return forbidden(res);

  const guardian = await getGuardianByIdAndOrg(guardianId, orgId);
  if (!guardian) return res.status(404).json({ error: "guardian_not_found" });

  const linkedPlayers = await listPlayersByGuardian({ orgId, guardianId });
  const activePlayers = linkedPlayers.filter((player) => (player.status ?? "active") === "active" && player.team_id);
  const teamIds = Array.from(new Set(activePlayers.map((p) => p.team_id)));
  if (!teamIds.length) {
    return res.status(200).json({ events: [] });
  }

  let { from: fromParam, to: toParam } = req.query || {};
  const filters = { orgId, teamIds };
  if (fromParam) {
    const parsed = parseDate(fromParam, { field: "from", required: true });
    filters.from = parsed;
  }
  if (toParam) {
    const parsed = parseDate(toParam, { field: "to", required: true });
    filters.to = parsed;
  }
  if (filters.from && filters.to && filters.to <= filters.from) {
    return badRequest(res, "to must be later than from");
  }

  const events = await listEvents({ orgId, teamIds, from: filters.from, to: filters.to });

  const playersByTeam = teamIds.reduce((acc, teamId) => {
    acc[teamId] = activePlayers.filter((p) => p.team_id === teamId).map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      display_name: p.display_name ?? null,
    }));
    return acc;
  }, {});

  const mapped = events.map((event) => {
    const teamKey = event.team_id ?? event.teamId;
    return {
      ...serializeEvent(event),
      players: playersByTeam[teamKey] || [],
    };
  });
  return res.status(200).json({ events: mapped });
});

router.post("/:orgId/guardians/:guardianId/events/:eventId/rsvp", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const guardianId = req.params.guardianId;
  const eventId = req.params.eventId;

  if (!allowGuardiansAdmin(req, orgId)) return forbidden(res);

  const unknown = rejectUnknownFields(req.body || {}, new Set(["player_id", "status", "notes"]));
  if (unknown) return badRequest(res, `unknown field: ${unknown}`);

  const playerId = req.body?.player_id;
  if (!playerId) return badRequest(res, "player_id is required");

  try {
    const status = normalizeGuardianStatus(req.body?.status);
    const notes = sanitizeGuardianNotes(req.body?.notes);

    const guardian = await requireGuardian(req, res, orgId, guardianId);
    if (!guardian) return;

    const event = await requireEvent(req, res, orgId, eventId);
    if (!event) return;

    const teamId = ensureEventHasTeam(event);
    if (!teamId) return badRequest(res, "event does not have a team and cannot accept guardian RSVPs");

    const linkedPlayers = await listPlayersByGuardian({ orgId, guardianId });
    const eligible = eligiblePlayersForEvent(linkedPlayers, teamId);
    const normalizedPlayerId = String(playerId);
    const targetPlayer = eligible.find((player) => String(player.id) === normalizedPlayerId);
    if (!targetPlayer) {
      return badRequest(res, "player is not eligible for guardian RSVP on this event");
    }

    const attendanceRow = await upsertPlayerAttendance({
      orgId,
      eventId,
      playerId: normalizedPlayerId,
      status,
      notes: notes ?? null,
      recordedBy: req.user?.id ?? null,
    });

    return res.status(200).json({
      ok: true,
      attendance: formatGuardianAttendanceResponse({ attendanceRow, guardianId }),
    });
  } catch (err) {
    return badRequest(res, err.message || "bad_request");
  }
});

router.get("/:orgId/guardians/:guardianId/events/:eventId/rsvp", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const guardianId = req.params.guardianId;
  const eventId = req.params.eventId;

  if (!allowGuardiansAdmin(req, orgId)) return forbidden(res);

  const guardian = await requireGuardian(req, res, orgId, guardianId);
  if (!guardian) return;

  const event = await requireEvent(req, res, orgId, eventId);
  if (!event) return;

  const teamId = ensureEventHasTeam(event);
  if (!teamId) return res.status(200).json({ rsvps: [] });

  const linkedPlayers = await listPlayersByGuardian({ orgId, guardianId });
  const eligible = eligiblePlayersForEvent(linkedPlayers, teamId);
  if (!eligible.length) {
    return res.status(200).json({ rsvps: [] });
  }

  const attendanceRows = await listAttendanceByEvent({ orgId, eventId });
  const attendanceByPlayer = new Map(attendanceRows.map((row) => [String(row.player_id ?? row.playerId), row]));

  const rsvps = eligible.map((player) => {
    const row = attendanceByPlayer.get(String(player.id));
    const attendance = row
      ? formatGuardianAttendanceResponse({ attendanceRow: row, guardianId })
      : {
          event_id: event.id,
          player_id: player.id,
          guardian_id: guardianId,
          status: null,
          notes: null,
          rsvp_status: null,
          updated_at: null,
        };
    return {
      player: {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        display_name: player.display_name ?? null,
      },
      attendance,
    };
  });

  return res.status(200).json({ rsvps });
});

export default router;
