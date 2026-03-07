import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { allowPlayersAdmin, badRequest, forbidden } from "./players.js";
import { getPlayerByIdAndOrg } from "../../repositories/playersRepo.js";
import { getEventById } from "../../repositories/eventsRepo.js";
import {
  upsertPlayerAttendance,
  listAttendanceByEvent,
} from "../../repositories/playerAttendanceRepo.js";

const router = Router({ mergeParams: true });

function sanitizeStatus(value) {
  if (!value) throw new Error("status must be one of: present, absent, late, excused");
  const normalized = value.toLowerCase();
  if (!["present", "absent", "late", "excused"].includes(normalized)) {
    throw new Error("status must be one of: present, absent, late, excused");
  }
  return normalized;
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

  if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

  const playerId = req.body?.player_id;
  if (!playerId) {
    return badRequest(res, "player_id is required");
  }

  try {
    const status = sanitizeStatus(req.body?.status);
    const notes = sanitizeNotes(req.body?.notes);

    const event = await getEventById({ id: eventId, orgId });
    if (!event) return res.status(404).json({ error: "event_not_found" });

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

  if (!allowPlayersAdmin(req, orgId)) return forbidden(res);

  const event = await getEventById({ id: eventId, orgId });
  if (!event) return res.status(404).json({ error: "event_not_found" });

  const attendance = await listAttendanceByEvent({ orgId, eventId });
  return res.status(200).json({ attendance });
});

export default router;
