import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { query } from "../../db/client.js";
import { getOrgSettings, updateOrgSettings } from "../../repositories/orgSettingsRepo.js";

const router = Router({ mergeParams: true });

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "age_categories",
  "competition_levels",
  "season",
  "default_training_duration_min",
  "evaluation_templates",
  "communication_policies",
]);

const COMM_POLICY_KEYS = new Set(["allow_dm", "parent_chat", "player_chat"]);

function allowOrgAdmin(req, orgId) {
  if (req.user?.isPlatformAdmin === true) return true;
  return (
    (req.user?.roles || []).includes("OrgAdmin") &&
    (req.user?.orgScopes || []).map(String).includes(String(orgId))
  );
}

function badRequest(res, message) {
  return res.status(400).json({ error: "bad_request", message });
}

async function ensureOrgExists(orgId) {
  // In non-DB mode, treat org ids as valid for admin routes.
  // Demo org existence is handled elsewhere; avoid DB calls that can hang.
  const { hasDatabase } = await import("../../db/client.js");
  if (!hasDatabase()) return true;

  const r = await query(`SELECT id FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);
  return r.rows.length > 0;
}

function rejectUnknownTopLevelKeys(patch) {
  for (const k of Object.keys(patch)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(k)) throw new Error(`unknown_key:${k}`);
  }
}

function rejectTopLevelNulls(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) throw new Error(`null_not_allowed:${k}`);
  }
}

function normalizeUniqueStrings(arr, { maxItems, maxLen, field }) {
  if (!Array.isArray(arr)) throw new Error(`invalid_${field}`);
  if (arr.length > maxItems) throw new Error(`invalid_${field}`);

  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    if (typeof raw !== "string") throw new Error(`invalid_${field}`);
    const v = raw.trim();
    if (!v || v.length > maxLen) throw new Error(`invalid_${field}`);
    const key = v.toLowerCase();
    if (seen.has(key)) throw new Error(`invalid_${field}`);
    seen.add(key);
    out.push(v);
  }
  return out;
}

function parseDateOnly(s) {
  if (typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function validateSeason(season) {
  if (typeof season !== "object" || !season || Array.isArray(season)) throw new Error("invalid_season");
  const start = parseDateOnly(season.start_date);
  const end = parseDateOnly(season.end_date);
  if (!start || !end) throw new Error("invalid_season");
  if (start.getTime() >= end.getTime()) throw new Error("invalid_season");
  return { start_date: season.start_date, end_date: season.end_date };
}

function validateDefaultTrainingDuration(v) {
  if (!Number.isInteger(v)) throw new Error("invalid_default_training_duration_min");
  if (v < 15 || v > 600) throw new Error("invalid_default_training_duration_min");
  return v;
}

function validateEvaluationTemplates(v) {
  if (!Array.isArray(v)) throw new Error("invalid_evaluation_templates");
  if (v.length > 20) throw new Error("invalid_evaluation_templates");

  const seenTemplateIds = new Set();
  const out = [];

  for (const t of v) {
    if (typeof t !== "object" || !t || Array.isArray(t)) throw new Error("invalid_evaluation_templates");

    const id = typeof t.id === "string" ? t.id.trim() : "";
    const name = typeof t.name === "string" ? t.name.trim() : "";
    if (!id || id.length > 64) throw new Error("invalid_evaluation_templates");
    if (!name || name.length > 120) throw new Error("invalid_evaluation_templates");
    if (seenTemplateIds.has(id)) throw new Error("invalid_evaluation_templates");
    seenTemplateIds.add(id);

    if (!Array.isArray(t.criteria) || t.criteria.length < 1 || t.criteria.length > 50) {
      throw new Error("invalid_evaluation_templates");
    }

    const seenCriteriaKeys = new Set();
    const criteria = [];
    for (const c of t.criteria) {
      if (typeof c !== "object" || !c || Array.isArray(c)) throw new Error("invalid_evaluation_templates");
      const key = typeof c.key === "string" ? c.key.trim() : "";
      const label = typeof c.label === "string" ? c.label.trim() : "";
      const weight = c.weight;

      if (!key || key.length > 64) throw new Error("invalid_evaluation_templates");
      if (!label || label.length > 120) throw new Error("invalid_evaluation_templates");
      if (typeof weight !== "number" || Number.isNaN(weight) || weight < 0 || weight > 100) {
        throw new Error("invalid_evaluation_templates");
      }

      if (seenCriteriaKeys.has(key)) throw new Error("invalid_evaluation_templates");
      seenCriteriaKeys.add(key);

      criteria.push({ key, label, weight });
    }

    out.push({ id, name, criteria });
  }

  return out;
}

function validateCommunicationPolicies(v) {
  if (typeof v !== "object" || !v || Array.isArray(v)) throw new Error("invalid_communication_policies");
  for (const k of Object.keys(v)) {
    if (!COMM_POLICY_KEYS.has(k)) throw new Error("invalid_communication_policies");
    if (typeof v[k] !== "boolean") throw new Error("invalid_communication_policies");
  }
  return {
    allow_dm: Boolean(v.allow_dm),
    parent_chat: Boolean(v.parent_chat),
    player_chat: Boolean(v.player_chat),
  };
}

function validatePatch(patch) {
  if (typeof patch !== "object" || !patch || Array.isArray(patch)) {
    throw new Error("bad_request");
  }

  rejectUnknownTopLevelKeys(patch);
  rejectTopLevelNulls(patch);

  const out = {};

  if (Object.prototype.hasOwnProperty.call(patch, "age_categories")) {
    out.age_categories = normalizeUniqueStrings(patch.age_categories, {
      maxItems: 50,
      maxLen: 32,
      field: "age_categories",
    });
  }

  if (Object.prototype.hasOwnProperty.call(patch, "competition_levels")) {
    out.competition_levels = normalizeUniqueStrings(patch.competition_levels, {
      maxItems: 50,
      maxLen: 32,
      field: "competition_levels",
    });
  }

  if (Object.prototype.hasOwnProperty.call(patch, "season")) {
    out.season = validateSeason(patch.season);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "default_training_duration_min")) {
    out.default_training_duration_min = validateDefaultTrainingDuration(patch.default_training_duration_min);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "evaluation_templates")) {
    out.evaluation_templates = validateEvaluationTemplates(patch.evaluation_templates);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "communication_policies")) {
    out.communication_policies = validateCommunicationPolicies(patch.communication_policies);
  }

  return out;
}

function enforceSizeLimit(settings) {
  const s = JSON.stringify(settings);
  if (s.length > 64 * 1024) throw new Error("settings_payload_too_large");
}

router.get("/:orgId/settings", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowOrgAdmin(req, orgId)) return res.status(403).json({ error: "forbidden" });

  const exists = await ensureOrgExists(orgId);
  if (!exists) return res.status(404).json({ error: "org_not_found" });

  const item = await getOrgSettings(orgId);
  // getOrgSettings returns null if org missing; we already checked existence.
  return res.status(200).json({ item: item || { org_id: orgId, settings: {} } });
});

router.patch("/:orgId/settings", requireSession, async (req, res) => {
  const orgId = req.params.orgId;
  if (!allowOrgAdmin(req, orgId)) return res.status(403).json({ error: "forbidden" });

  const exists = await ensureOrgExists(orgId);
  if (!exists) return res.status(404).json({ error: "org_not_found" });

  let validated;
  try {
    validated = validatePatch(req.body || {});
  } catch (err) {
    const msg = err.message || "bad_request";
    if (msg.startsWith("unknown_key:")) return badRequest(res, msg);
    if (msg.startsWith("null_not_allowed:")) return badRequest(res, msg);

    // Map the specific invalid_* codes as messages.
    if (String(msg).startsWith("invalid_")) return badRequest(res, msg);
    if (msg === "settings_payload_too_large") return badRequest(res, msg);

    return badRequest(res, "bad_request");
  }

  const current = (await getOrgSettings(orgId)) || { org_id: orgId, settings: {} };
  const merged = { ...(current.settings || {}), ...validated };

  try {
    enforceSizeLimit(merged);
  } catch {
    return badRequest(res, "settings_payload_too_large");
  }

  const updated = await updateOrgSettings(orgId, merged);
  if (!updated) return res.status(404).json({ error: "org_not_found" });

  return res.status(200).json({ item: updated });
});

export default router;
