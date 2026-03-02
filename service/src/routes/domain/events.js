import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { badRequest, parsePagination, notFound } from "./_helpers.js";
import { createEvent, deleteEvent, listEvents, updateEvent } from "../../repositories/eventsRepo.js";

const router = Router();

function parseISODate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

router.get("/", requireSession, requirePermission("events.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  const teamId = String(req.query?.teamId || "").trim();
  if (!orgId) return res.status(400).json({ error: { code: "bad_request", message: "active org required" } });
  if (!teamId) return badRequest(res, "teamId is required");

  // MVP: basic team scope enforcement
  if (req.user?.teamScopes?.length && !req.user.teamScopes.map(String).includes(String(teamId))) {
    return res.status(403).json({ error: "forbidden", reason: "team_scope_restriction" });
  }

  const { limit } = parsePagination(req.query);
  const from = parseISODate(req.query?.from);
  const to = parseISODate(req.query?.to);

  const items = await listEvents({ orgId, teamId, from, to, limit });
  res.status(200).json({ items });
});

router.post("/", requireSession, requirePermission("events.create"), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  const teamId = String(req.body?.teamId || "").trim();
  const type = String(req.body?.type || "").trim();
  const startsAt = parseISODate(req.body?.startsAt);
  const endsAt = parseISODate(req.body?.endsAt);
  const location = req.body?.location ? String(req.body.location).trim() : null;
  const notes = req.body?.notes ? String(req.body.notes).trim() : null;

  if (!orgId) return res.status(400).json({ error: { code: "bad_request", message: "active org required" } });
  if (!teamId) return badRequest(res, "teamId is required");
  if (!type) return badRequest(res, "type is required");
  if (!startsAt) return badRequest(res, "startsAt must be an ISO date" );

  if (endsAt && endsAt < startsAt) return badRequest(res, "endsAt must be >= startsAt");
  if (!["practice", "game", "tournament", "tryout", "custom"].includes(type)) {
    return badRequest(res, "type must be one of practice|game|tournament|tryout|custom");
  }

  if (req.user?.teamScopes?.length && !req.user.teamScopes.map(String).includes(String(teamId))) {
    return res.status(403).json({ error: "forbidden", reason: "team_scope_restriction" });
  }

  const event = await createEvent({
    orgId,
    teamId,
    type,
    startsAt,
    endsAt,
    location,
    notes,
    createdBy: req.user?.id || null
  });
  res.status(201).json(event);
});

router.patch("/:id", requireSession, requirePermission("events.update"), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return res.status(400).json({ error: { code: "bad_request", message: "active org required" } });

  const patch = {};
  if (req.body?.type !== undefined) patch.type = String(req.body.type || "").trim();
  if (req.body?.startsAt !== undefined) patch.starts_at = parseISODate(req.body.startsAt);
  if (req.body?.endsAt !== undefined) patch.ends_at = req.body.endsAt ? parseISODate(req.body.endsAt) : null;
  if (req.body?.location !== undefined) patch.location = req.body.location ? String(req.body.location).trim() : null;
  if (req.body?.notes !== undefined) patch.notes = req.body.notes ? String(req.body.notes).trim() : null;

  if (patch.type && !["practice", "game", "tournament", "tryout", "custom"].includes(patch.type)) {
    return badRequest(res, "type must be one of practice|game|tournament|tryout|custom");
  }
  if (patch.starts_at === null && req.body?.startsAt !== undefined) return badRequest(res, "startsAt must be an ISO date");
  if (patch.ends_at === null && req.body?.endsAt) return badRequest(res, "endsAt must be an ISO date");

  const updated = await updateEvent({ id: req.params.id, orgId, patch });
  if (!updated) return notFound(res, "Event not found");

  // MVP scope check: if user has teamScopes, ensure event team_id is allowed
  const eventTeamId = updated.team_id ?? updated.teamId;
  if (req.user?.teamScopes?.length && !req.user.teamScopes.map(String).includes(String(eventTeamId))) {
    return res.status(403).json({ error: "forbidden", reason: "team_scope_restriction" });
  }

  res.status(200).json(updated);
});

router.delete("/:id", requireSession, requirePermission("events.delete"), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return res.status(400).json({ error: { code: "bad_request", message: "active org required" } });

  // Note: we rely on org_id restriction in delete; team scope enforcement can be layered later.
  const ok = await deleteEvent({ id: req.params.id, orgId });
  if (!ok) return notFound(res, "Event not found");
  res.status(204).send();
});

export default router;
