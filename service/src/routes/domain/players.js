import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createPlayer, deletePlayer, listPlayersByOrg, updatePlayer } from "../../repositories/playersRepo.js";
import { badRequest, notFound, parsePagination } from "./_helpers.js";

const router = Router();

router.get("/", requireSession, requirePermission("players.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { limit, offset } = parsePagination(req.query);
  const items = await listPlayersByOrg(orgId, { limit, offset });
  res.status(200).json({ items, paging: { limit, offset } });
});

router.post("/", requireSession, requirePermission("players.function.create"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { firstName, lastName, email = null, teamId = null } = req.body || {};

  if (!firstName || !lastName || typeof firstName !== "string" || typeof lastName !== "string") {
    return badRequest(res, "firstName and lastName are required");
  }

  if (email !== null && typeof email !== "string") {
    return badRequest(res, "email must be a string when provided");
  }

  const player = await createPlayer({
    orgId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email,
    teamId
  });
  res.status(201).json(player);
});

router.patch("/:id", requireSession, requirePermission("players.function.update"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { firstName, lastName, email, teamId, status } = req.body || {};

  if (firstName !== undefined && (typeof firstName !== "string" || !firstName.trim())) {
    return badRequest(res, "firstName must be a non-empty string when provided");
  }

  if (lastName !== undefined && (typeof lastName !== "string" || !lastName.trim())) {
    return badRequest(res, "lastName must be a non-empty string when provided");
  }

  if (email !== undefined && email !== null && typeof email !== "string") {
    return badRequest(res, "email must be a string when provided");
  }

  const updated = await updatePlayer({
    orgId,
    playerId: req.params.id,
    firstName: firstName?.trim(),
    lastName: lastName?.trim(),
    email,
    teamId,
    status
  });
  if (!updated) return notFound(res, "Player not found");
  res.status(200).json(updated);
});

router.delete("/:id", requireSession, requirePermission("players.function.deactivate"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const ok = await deletePlayer({ orgId, playerId: req.params.id });
  if (!ok) return notFound(res, "Player not found");
  res.status(204).send();
});

export default router;
