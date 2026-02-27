import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createPlayer, deletePlayer, listPlayersByOrg, updatePlayer } from "../../repositories/playersRepo.js";

const router = Router();

router.get("/", requireSession, requirePermission("players.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const items = await listPlayersByOrg(orgId);
  res.status(200).json({ items });
});

router.post("/", requireSession, requirePermission("players.function.create"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { firstName, lastName, email = null, teamId = null } = req.body || {};
  if (!firstName || !lastName) return res.status(400).json({ error: "firstName and lastName required" });

  const player = await createPlayer({ orgId, firstName, lastName, email, teamId });
  res.status(201).json(player);
});

router.patch("/:id", requireSession, requirePermission("players.function.update"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const updated = await updatePlayer({
    orgId,
    playerId: req.params.id,
    firstName: req.body?.firstName,
    lastName: req.body?.lastName,
    email: req.body?.email,
    teamId: req.body?.teamId,
    status: req.body?.status
  });
  if (!updated) return res.status(404).json({ error: "not_found" });
  res.status(200).json(updated);
});

router.delete("/:id", requireSession, requirePermission("players.function.deactivate"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const ok = await deletePlayer({ orgId, playerId: req.params.id });
  if (!ok) return res.status(404).json({ error: "not_found" });
  res.status(204).send();
});

export default router;
