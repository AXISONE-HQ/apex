import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import {
  createSeason,
  listSeasons,
  getSeasonById,
  updateSeason,
} from "../../repositories/seasonsRepo.js";

const router = Router({ mergeParams: true });

const POST_FIELDS = new Set(["label", "year", "starts_on", "ends_on", "status"]);
const PATCH_FIELDS = POST_FIELDS;

function isDateRangeConstraint(err) {
  return err?.code === "23514" && err?.constraint === "seasons_date_range_check";
}

function allowSeasonsAdmin(req, orgId) {
  if (req.user?.isPlatformAdmin) return true;
  const roles = new Set((req.user?.roles || []).map(String));
  const hasOrgAdmin = roles.has("OrgAdmin");
  if (!hasOrgAdmin) return false;
  const scopes = (req.user?.orgScopes || []).map(String);
  return scopes.includes(String(orgId));
}

function forbidden(res) {
  return res.status(403).json({ error: "forbidden" });
}

function badRequest(res, message) {
  return res.status(400).json({ error: "bad_request", message });
}

function rejectUnknownFields(body, allowed) {
  const keys = Object.keys(body || {});
  for (const key of keys) {
    if (!allowed.has(key)) return key;
  }
  return null;
}

function sanitizeString(value, { field, required = false, max = 120 }) {
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
  if (!trimmed && required) throw new Error(`${field} is required`);
  if (max && trimmed.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return trimmed || null;
}

function sanitizeOptionalInt(value, { field, min, max }) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  return num;
}

function sanitizeDate(value, { field }) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${field} must be a YYYY-MM-DD string`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`${field} must be a YYYY-MM-DD string`);
  }
  return trimmed;
}

function ensureDateOrder({ starts_on, ends_on }) {
  if (starts_on && ends_on && ends_on < starts_on) {
    throw new Error("invalid_date_range");
  }
}

function normalizeItem(row) {
  return row;
}

router.post("/:orgId/seasons", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowSeasonsAdmin(req, orgId)) return forbidden(res);

  const unknown = rejectUnknownFields(req.body || {}, POST_FIELDS);
  if (unknown) return badRequest(res, `unknown field: ${unknown}`);

  try {
    const label = sanitizeString(req.body?.label, { field: "label", required: true });
    const year = sanitizeOptionalInt(req.body?.year, { field: "year", min: 2000, max: 2100 });
    const starts_on = sanitizeDate(req.body?.starts_on, { field: "starts_on" });
    const ends_on = sanitizeDate(req.body?.ends_on, { field: "ends_on" });
    const status = req.body?.status;
    ensureDateOrder({ starts_on, ends_on });

    const item = await createSeason({
      orgId,
      label,
      year,
      starts_on,
      ends_on,
      status,
    });

    return res.status(201).json({ item: normalizeItem(item) });
  } catch (err) {
    if (err.message === "invalid_status") {
      return badRequest(res, "status must be one of: draft, active, completed, archived");
    }
    if (err.message === "invalid_date_range" || isDateRangeConstraint(err)) {
      return badRequest(res, "ends_on must be on or after starts_on");
    }
    if (err.code === "23505") {
      return res.status(409).json({ error: "conflict", message: "duplicate_season" });
    }
    return badRequest(res, err.message || "invalid_payload");
  }
});

router.get("/:orgId/seasons", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowSeasonsAdmin(req, orgId)) return forbidden(res);

  const status = req.query?.status ? String(req.query.status) : null;
  try {
    const items = await listSeasons(orgId, { status });
    return res.status(200).json({ items: items.map(normalizeItem) });
  } catch (err) {
    if (err.message === "invalid_status") {
      return badRequest(res, "status must be one of: draft, active, completed, archived");
    }
    throw err;
  }
});

router.get("/:orgId/seasons/:seasonId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const seasonId = req.params.seasonId;
  if (!allowSeasonsAdmin(req, orgId)) return forbidden(res);

  const season = await getSeasonById(orgId, seasonId);
  if (!season) return res.status(404).json({ error: "not_found" });
  return res.status(200).json({ item: normalizeItem(season) });
});

router.patch("/:orgId/seasons/:seasonId", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  const seasonId = req.params.seasonId;
  if (!allowSeasonsAdmin(req, orgId)) return forbidden(res);

  const unknown = rejectUnknownFields(req.body || {}, PATCH_FIELDS);
  if (unknown) return badRequest(res, `unknown field: ${unknown}`);

  try {
    const patch = {};
    if (req.body?.label !== undefined) {
      patch.label = sanitizeString(req.body.label, { field: "label", required: true });
    }
    if (req.body?.year !== undefined) {
      patch.year = sanitizeOptionalInt(req.body.year, { field: "year", min: 2000, max: 2100 });
    }
    if (req.body?.starts_on !== undefined) {
      patch.starts_on = sanitizeDate(req.body.starts_on, { field: "starts_on" });
    }
    if (req.body?.ends_on !== undefined) {
      patch.ends_on = sanitizeDate(req.body.ends_on, { field: "ends_on" });
    }
    if (req.body?.status !== undefined) {
      patch.status = req.body.status;
    }

    if (patch.starts_on !== undefined || patch.ends_on !== undefined) {
      const existing = await getSeasonById(orgId, seasonId);
      if (!existing) return res.status(404).json({ error: "not_found" });
      const starts_on = patch.starts_on !== undefined ? patch.starts_on : existing.starts_on;
      const ends_on = patch.ends_on !== undefined ? patch.ends_on : existing.ends_on;
      ensureDateOrder({ starts_on, ends_on });
    }

    const updated = await updateSeason(orgId, seasonId, patch);
    if (!updated) return res.status(404).json({ error: "not_found" });
    return res.status(200).json({ item: normalizeItem(updated) });
  } catch (err) {
    if (err.message === "invalid_status") {
      return badRequest(res, "status must be one of: draft, active, completed, archived");
    }
    if (err.message === "invalid_date_range" || isDateRangeConstraint(err)) {
      return badRequest(res, "ends_on must be on or after starts_on");
    }
    if (err.code === "INVALID_STATUS") {
      return badRequest(res, "invalid_status_transition");
    }
    if (err.message === "no_updatable_fields") {
      return badRequest(res, err.message);
    }
    throw err;
  }
});

export default router;
