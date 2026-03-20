import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { badRequest, notFound, parsePagination } from "./_helpers.js";
import {
  createRegistration,
  getRegistration,
  listRegistrationsByGuardian,
  listRegistrationsBySeason,
  promoteFromWaitlist,
  updateRegistrationStatus,
  withdrawRegistration,
} from "../../repositories/registrationsRepo.js";
import { listPlayersByGuardian } from "../../repositories/guardianPlayersRepo.js";
import { getSeasonById } from "../../repositories/seasonsRepo.js";

const router = Router();

router.get("/", requireSession, requirePermission("registrations.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId;
  if (!orgId) return badRequest(res, "active org required");

  const seasonId = String(req.query?.seasonId || "").trim();
  if (!seasonId) return badRequest(res, "seasonId is required");
  const status = req.query?.status ? String(req.query.status).trim() : null;
  const { limit, offset } = parsePagination(req.query);

  try {
    const items = await listRegistrationsBySeason(orgId, seasonId, { status, limit, offset });
    return res.status(200).json({ items, paging: { limit, offset } });
  } catch (err) {
    if (err.message === "invalid_status" || err.message === "status_required") {
      return badRequest(res, "status must be pending|approved|rejected|waitlisted|withdrawn");
    }
    throw err;
  }
});

router.get(
  "/mine",
  requireSession,
  requirePermission("registrations.page.view_own"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    const guardianId = req.user?.guardianId;
    if (!guardianId) return res.status(403).json({ error: "forbidden", reason: "guardian_only" });

    const { limit, offset } = parsePagination(req.query);
    const items = await listRegistrationsByGuardian(orgId, guardianId, { limit, offset });
    return res.status(200).json({ items, paging: { limit, offset } });
  }
);

router.get(
  "/:id",
  requireSession,
  requirePermission("registrations.page.view"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    const registration = await getRegistration(orgId, req.params.id);
    if (!registration) return notFound(res, "registration_not_found");
    return res.status(200).json({ registration });
  }
);

router.post(
  "/",
  requireSession,
  requirePermission("registrations.function.create"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    const guardianId = req.user?.guardianId;
    if (!guardianId) return res.status(403).json({ error: "forbidden", reason: "guardian_only" });

    const seasonId = String(req.body?.seasonId || "").trim();
    const playerId = String(req.body?.playerId || "").trim();

    if (!seasonId) return badRequest(res, "seasonId is required");
    if (!playerId) return badRequest(res, "playerId is required");

    const season = await getSeasonById(orgId, seasonId);
    if (!season) return notFound(res, "season_not_found");
    const seasonStatus = season.status;
    if (seasonStatus !== "active") {
      return badRequest(res, "registrations can only be submitted for active seasons");
    }

    const linkedPlayers = await listPlayersByGuardian({ orgId, guardianId });
    const isLinked = linkedPlayers.some((player) => String(player.id) === String(playerId));
    if (!isLinked) {
      return badRequest(res, "guardian is not linked to this player");
    }

    try {
      const registration = await createRegistration({ orgId, seasonId, playerId, guardianId });
      return res.status(201).json({ registration });
    } catch (err) {
      if (err.code === "23505" || err.message === "duplicate_registration") {
        return res.status(409).json({ error: "duplicate_registration" });
      }
      throw err;
    }
  }
);

router.patch(
  "/:id/status",
  requireSession,
  requirePermission("registrations.function.review"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");

    const status = String(req.body?.status || "").trim();
    if (!status) return badRequest(res, "status is required");

    const notes = req.body?.notes !== undefined ? String(req.body.notes).trim() : null;
    const waitlistPosition =
      req.body?.waitlistPosition !== undefined ? Number(req.body.waitlistPosition) : null;

    try {
      const registration = await updateRegistrationStatus(orgId, req.params.id, {
        status,
        reviewedBy: req.user?.id || null,
        notes,
        waitlistPosition,
      });
      if (!registration) return notFound(res, "registration_not_found");
      return res.status(200).json({ registration });
    } catch (err) {
      if (err.message === "invalid_status" || err.message === "status_required") {
        return badRequest(res, "status must be pending|approved|rejected|waitlisted|withdrawn");
      }
      throw err;
    }
  }
);

router.delete(
  "/:id",
  requireSession,
  requirePermission("registrations.function.withdraw"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    const guardianId = req.user?.guardianId;
    if (!guardianId) return res.status(403).json({ error: "forbidden", reason: "guardian_only" });

    try {
      const registration = await withdrawRegistration(orgId, req.params.id, guardianId);
      if (!registration) return notFound(res, "registration_not_found");
      return res.status(200).json({ registration });
    } catch (err) {
      if (err.code === "INVALID_STATE") {
        return badRequest(res, "registration cannot be withdrawn in its current status");
      }
      if (err.code === "FORBIDDEN") {
        return res.status(403).json({ error: "forbidden" });
      }
      throw err;
    }
  }
);

// (Admin convenience) promote next waitlisted registration to pending
router.post(
  "/:seasonId/waitlist/promote",
  requireSession,
  requirePermission("registrations.function.review"),
  async (req, res) => {
    const orgId = req.user?.activeOrgId;
    if (!orgId) return badRequest(res, "active org required");
    const seasonId = req.params.seasonId;
    const registration = await promoteFromWaitlist(orgId, seasonId);
    if (!registration) return notFound(res, "waitlist_empty");
    return res.status(200).json({ registration });
  }
);

export default router;
