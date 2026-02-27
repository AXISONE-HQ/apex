import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { createTeam, deleteTeam, listTeamsByOrg, updateTeam } from "../../repositories/teamsRepo.js";
import { badRequest, notFound, parsePagination } from "./_helpers.js";

const router = Router();

router.get("/", requireSession, requirePermission("teams.page.view"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { limit, offset } = parsePagination(req.query);
  const items = await listTeamsByOrg(orgId, { limit, offset });
  res.status(200).json({ items, paging: { limit, offset } });
});

router.post("/", requireSession, requirePermission("teams.function.create"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { name, code = null } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return badRequest(res, "name is required");
  }

  if (code !== null && typeof code !== "string") {
    return badRequest(res, "code must be a string when provided");
  }

  const team = await createTeam({ orgId, name: name.trim(), code });
  res.status(201).json(team);
});

router.patch("/:id", requireSession, requirePermission("teams.function.update"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const { name, code } = req.body || {};

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return badRequest(res, "name must be a non-empty string when provided");
  }

  if (code !== undefined && code !== null && typeof code !== "string") {
    return badRequest(res, "code must be a string when provided");
  }

  const updated = await updateTeam({ orgId, teamId: req.params.id, name: name?.trim(), code });
  if (!updated) return notFound(res, "Team not found");
  res.status(200).json(updated);
});

router.delete("/:id", requireSession, requirePermission("teams.function.delete"), async (req, res) => {
  const orgId = req.user?.activeOrgId || "org_demo";
  const ok = await deleteTeam({ orgId, teamId: req.params.id });
  if (!ok) return notFound(res, "Team not found");
  res.status(204).send();
});

export default router;
