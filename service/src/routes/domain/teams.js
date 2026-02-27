import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createTeam, deleteTeam, listTeamsByOrg, updateTeam } from "../../repositories/teamsRepo.js";

const router = Router();

router.get("/", requireSession, requirePermission("teams.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const items = await listTeamsByOrg(orgId);
  res.status(200).json({ items });
});

router.post("/", requireSession, requirePermission("teams.function.create"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { name, code = null } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });

  const team = await createTeam({ orgId, name, code });
  res.status(201).json(team);
});

router.patch("/:id", requireSession, requirePermission("teams.function.update"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const updated = await updateTeam({ orgId, teamId: req.params.id, name: req.body?.name, code: req.body?.code });
  if (!updated) return res.status(404).json({ error: "not_found" });
  res.status(200).json(updated);
});

router.delete("/:id", requireSession, requirePermission("teams.function.delete"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const ok = await deleteTeam({ orgId, teamId: req.params.id });
  if (!ok) return res.status(404).json({ error: "not_found" });
  res.status(204).send();
});

export default router;
