import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { badRequest } from "../domain/_helpers.js";
import {
  getOrganizationById,
  updateOrganizationProfile,
} from "../../repositories/organizationsRepo.js";
import { signV4ReadUrl } from "../../lib/gcs.js";

const router = Router({ mergeParams: true });

const ALLOWED_SPORT_TYPES = new Set([
  "basketball",
  "soccer",
  "hockey",
  "volleyball",
  "other",
]);

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function validateNoUnknownFields(body, allowedKeys) {
  const keys = Object.keys(body || {});
  const unknown = keys.filter((k) => !allowedKeys.includes(k));
  return unknown;
}

function sanitizeOnboardingStatus(next) {
  // Whitelist keys only. Avoid turning onboarding_status into a junk drawer.
  if (next == null) return null;
  if (typeof next !== "object" || Array.isArray(next)) return null;

  const allowedSteps = new Set(["createClub", "settings", "coaches", "teams"]);
  const allowedRoot = new Set(["steps"]);

  const out = {};
  for (const [k, v] of Object.entries(next)) {
    if (!allowedRoot.has(k)) continue;
    if (k === "steps") {
      if (typeof v !== "object" || v == null || Array.isArray(v)) continue;
      const stepsOut = {};
      for (const [sk, sv] of Object.entries(v)) {
        if (!allowedSteps.has(sk)) continue;
        // Accept boolean or timestamp-ish string.
        if (typeof sv === "boolean") stepsOut[sk] = sv;
        else if (typeof sv === "string" && sv.length <= 64) stepsOut[sk] = sv;
      }
      out.steps = stepsOut;
    }
  }
  return out;
}

// GET /admin/clubs/:orgId
router.get(
  "/:orgId",
  requireSession,
  requirePermission("admin.page.clubs.view", () => ({ type: "platform" })),
  async (req, res) => {
    const orgId = req.params.orgId;
    const org = await getOrganizationById(orgId);
    if (!org) return res.status(404).json({ error: "org_not_found" });

    // Optional convenience: mint read URL server-side (do not persist)
    let logoReadUrl = null;
    if (org.logo_object_path) {
      try {
        logoReadUrl = await signV4ReadUrl({ objectPath: org.logo_object_path, expiresMinutes: 60 });
      } catch {
        // keep null if signing fails
      }
    }

    return res.status(200).json({
      id: org.id,
      name: org.name,
      sport_type: org.sport_type,
      location: {
        state_province: org.state_province ?? null,
        country: org.country ?? null,
      },
      subscription_plan: org.subscription_plan,
      onboarding_status: org.onboarding_status || {},
      logo_object_path: org.logo_object_path,
      logoReadUrl,
      logoReadUrlExpiresMinutes: logoReadUrl ? 60 : null,
    });
  }
);

// PATCH /admin/clubs/:orgId
router.patch(
  "/:orgId",
  requireSession,
  requirePermission("admin.clubs.update", (req) => ({ type: "organization", id: req.params.orgId })),
  async (req, res) => {
    const orgId = req.params.orgId;
    const body = req.body || {};

    const allowedKeys = ["sport_type", "location", "subscription_plan", "onboarding_status"];
    const unknown = validateNoUnknownFields(body, allowedKeys);
    if (unknown.length) {
      return badRequest(res, "unknown_fields", { unknown });
    }

    let sport_type = undefined;
    if (body.sport_type !== undefined) {
      if (typeof body.sport_type !== "string") return badRequest(res, "sport_type must be a string");
      const v = body.sport_type.toLowerCase();
      if (!ALLOWED_SPORT_TYPES.has(v)) {
        return res.status(400).json({ error: "invalid_sport_type", allowed: [...ALLOWED_SPORT_TYPES] });
      }
      sport_type = v;
    }

    let state_province = undefined;
    let country = undefined;
    if (body.location !== undefined) {
      if (body.location === null || typeof body.location !== "object" || Array.isArray(body.location)) {
        return badRequest(res, "location must be an object");
      }
      const locAllowed = ["state_province", "country"];
      const locUnknown = Object.keys(body.location).filter((k) => !locAllowed.includes(k));
      if (locUnknown.length) return badRequest(res, "unknown_location_fields", { unknown: locUnknown });

      if (body.location.state_province !== undefined) {
        if (body.location.state_province !== null && typeof body.location.state_province !== "string") {
          return badRequest(res, "location.state_province must be a string or null");
        }
        state_province = body.location.state_province;
      }
      if (body.location.country !== undefined) {
        if (body.location.country !== null && typeof body.location.country !== "string") {
          return badRequest(res, "location.country must be a string or null");
        }
        country = body.location.country;
      }
    }

    let subscription_plan = undefined;
    if (body.subscription_plan !== undefined) {
      if (body.subscription_plan !== null && typeof body.subscription_plan !== "string") {
        return badRequest(res, "subscription_plan must be a string or null");
      }
      subscription_plan = body.subscription_plan;
    }

    let onboarding_status = undefined;
    if (body.onboarding_status !== undefined) {
      const sanitized = sanitizeOnboardingStatus(body.onboarding_status);
      if (sanitized === null) return badRequest(res, "invalid_onboarding_status");
      onboarding_status = sanitized;
    }

    // Ensure we do not accidentally overwrite logo_object_path via profile patch.
    const updated = await updateOrganizationProfile({
      id: orgId,
      sport_type,
      state_province,
      country,
      subscription_plan,
      onboarding_status,
    });

    if (!updated) return res.status(404).json({ error: "org_not_found" });

    return res.status(200).json({
      id: updated.id,
      name: updated.name,
      sport_type: updated.sport_type,
      location: {
        state_province: updated.state_province ?? null,
        country: updated.country ?? null,
      },
      subscription_plan: updated.subscription_plan,
      onboarding_status: updated.onboarding_status || {},
      logo_object_path: updated.logo_object_path || null,
    });
  }
);

export default router;
