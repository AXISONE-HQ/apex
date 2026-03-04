import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePlatformAdmin } from "../../middleware/requirePlatformAdmin.js";
import { badRequest } from "../domain/_helpers.js";
import {
  createOrganization,
  ensureMembershipRole,
  insertOnboardingEvent,
} from "../../repositories/adminClubsRepo.js";

const router = Router({ mergeParams: true });

const ALLOWED_SPORT_TYPES = new Set([
  "basketball",
  "soccer",
  "hockey",
  "volleyball",
  "other",
]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// POST /admin/clubs
router.post(
  "/",
  requireSession,
  requirePlatformAdmin(),
  async (req, res) => {
    const body = req.body || {};

    const name = body.name;
    const sport_type = body.sport_type;
    const subscription_plan = body.subscription_plan ?? "trial";
    const director_email = normalizeEmail(body.director_email);

    if (!name || typeof name !== "string") return badRequest(res, "name required");
    if (!sport_type || typeof sport_type !== "string") return badRequest(res, "sport_type required");
    const st = sport_type.toLowerCase();
    if (!ALLOWED_SPORT_TYPES.has(st)) {
      return res.status(400).json({ error: "invalid_sport_type", allowed: [...ALLOWED_SPORT_TYPES] });
    }
    if (!director_email) return badRequest(res, "director_email required");

    // Location allowlist
    let state_province = null;
    let country = null;
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

    // PR2 contract: director user must already exist.
    // We only support existing users here; invites come later.
    // usersRepo has no "get by email" helper yet; use DB lookup via upsertUserFromIdentity is not appropriate.
    const { findUserByEmail } = await import("../../repositories/usersLookupRepo.js");
    const director = await findUserByEmail(director_email);
    if (!director) {
      return res.status(404).json({ error: "director_user_not_found" });
    }

    const onboarding_status = {
      steps: { createClub: true, settings: false, coaches: false, teams: false },
    };

    const org = await createOrganization({
      name,
      sport_type: st,
      state_province,
      country,
      subscription_plan,
      onboarding_status,
    });

    await ensureMembershipRole({ userId: director.id, orgId: org.id, roleCode: "OrgAdmin" });
    await insertOnboardingEvent({
      orgId: org.id,
      event_code: "CLUB_CREATED",
      actor_user_id: req.user?.id || null,
      meta: { director_email, orgName: name },
    });

    return res.status(201).json({
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        sport_type: org.sport_type,
        location: { state_province: org.state_province ?? null, country: org.country ?? null },
        subscription_plan: org.subscription_plan,
        onboarding_status: org.onboarding_status || onboarding_status,
      },
      director: { id: director.id, email: director.email },
    });
  }
);

export default router;
