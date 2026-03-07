import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import {
  createGuardian,
  listGuardiansByOrg,
  getGuardianByIdAndOrg,
  updateGuardian,
} from "../../repositories/guardiansRepo.js";
import { listPlayersByGuardian } from "../../repositories/guardianPlayersRepo.js";

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

function sanitizeEmail(value) {
  const result = sanitizeOptionalString(value, { field: "email", max: 255 });
  if (result === undefined || result === null) return result;
  return result.toLowerCase();
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
      patch.email = sanitizeEmail(req.body.email) ?? null;
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
    return res.status(200).json({ players });
  }
);

export default router;
