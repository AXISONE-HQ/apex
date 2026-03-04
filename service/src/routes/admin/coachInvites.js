import { Router } from "express";
import { requireSession } from "../../middleware/requireSession.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { requirePlatformAdmin } from "../../middleware/requirePlatformAdmin.js";
import { badRequest } from "../domain/_helpers.js";
import {
  INVITE_EXPIRY_HOURS,
  canReturnInviteLink,
  hashInviteToken,
  newRawInviteToken,
  normalizeEmail,
  requireInvitePepper,
} from "../../lib/invites.js";
import { createInvite, getInviteById, markInviteRevoked } from "../../repositories/invitesRepo.js";
import { insertOnboardingEvent } from "../../repositories/onboardingEventsRepo.js";

const router = Router({ mergeParams: true });

function isUuidish(v) {
  return typeof v === "string" && v.length >= 8 && v.length <= 64;
}

function allowInviteActor(req, orgId) {
  // Platform admin can invite anywhere; otherwise require OrgAdmin role with org scope.
  if (req.user?.isPlatformAdmin === true) return true;
  return (req.user?.roles || []).includes("OrgAdmin") && (req.user?.orgScopes || []).map(String).includes(String(orgId));
}

router.post(
  "/clubs/:orgId/coaches/invite",
  requireSession,
  async (req, res, next) => {
    // Custom RBAC: platform admin OR OrgAdmin scoped to org.
    const orgId = req.params.orgId;
    if (!allowInviteActor(req, orgId)) {
      return res.status(403).json({ error: "forbidden", reason: "invite_requires_platform_or_org_admin" });
    }
    next();
  },
  async (req, res) => {
    const orgId = req.params.orgId;
    if (!orgId) return badRequest(res, "orgId required");

    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const coach_type = String(body.coach_type || "").trim().toLowerCase();
    const team_ids = Array.isArray(body.team_ids) ? body.team_ids.map(String) : [];

    if (!email) return badRequest(res, "email required");
    if (!coach_type) return badRequest(res, "coach_type required");
    if (!['head','assistant'].includes(coach_type)) {
      return res.status(400).json({ error: "invalid_coach_type" });
    }
    for (const t of team_ids) {
      if (!isUuidish(t)) return res.status(400).json({ error: "invalid_team_id" });
    }

    const pepper = requireInvitePepper();
    const token = newRawInviteToken();
    const tokenHash = hashInviteToken(token, pepper);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const invite = await createInvite({
      orgId,
      email,
      roleCode: "ManagerCoach",
      coachType: coach_type,
      teamIds: team_ids,
      tokenHash,
      expiresAt,
      createdByUserId: req.user?.id,
    });

    await insertOnboardingEvent({
      orgId,
      event_code: "COACH_INVITED",
      actor_user_id: req.user?.id || null,
      meta: { email, coach_type, team_ids_count: team_ids.length },
    });

    const out = {
      inviteId: invite.id,
      expiresAt: invite.expires_at || expiresAt,
      status: invite.status || "pending",
    };

    if (canReturnInviteLink()) {
      // Non-prod convenience: return a link/token.
      out.inviteToken = token;
      out.inviteLink = `/invite?token=${token}`;
      console.warn("[NON_PROD] Invite token issued", { orgId, inviteId: invite.id, email });
    }

    return res.status(201).json(out);
  }
);

router.post(
  "/invites/:inviteId/revoke",
  requireSession,
  async (req, res, next) => {
    // Need invite to check org; allow platform admin always; org admin scoped otherwise.
    const inv = await getInviteById(req.params.inviteId);
    if (!inv) return res.status(404).json({ error: "invite_not_found" });

    const orgId = inv.org_id;
    if (req.user?.isPlatformAdmin === true) return next();
    if ((req.user?.roles || []).includes("OrgAdmin") && (req.user?.orgScopes || []).map(String).includes(String(orgId))) {
      req._invite = inv;
      return next();
    }
    return res.status(403).json({ error: "forbidden", reason: "revoke_requires_platform_or_org_admin" });
  },
  async (req, res) => {
    const inv = req._invite || (await getInviteById(req.params.inviteId));
    if (!inv) return res.status(404).json({ error: "invite_not_found" });

    const updated = await markInviteRevoked({ inviteId: inv.id });
    if (!updated) return res.status(409).json({ error: "invite_not_pending" });

    await insertOnboardingEvent({
      orgId: inv.org_id,
      event_code: "INVITE_REVOKED",
      actor_user_id: req.user?.id || null,
      meta: { inviteId: inv.id, email: inv.email },
    });

    return res.status(200).json({ status: "revoked" });
  }
);

export default router;
