import { Router } from "express";
import { verifyIdentityToken } from "../auth/firebase.js";
import { badRequest } from "./domain/_helpers.js";
import {
  hashInviteToken,
  normalizeEmail,
  requireInvitePepper,
} from "../lib/invites.js";
import {
  getInviteByTokenHash,
  markInviteAccepted,
  markInviteExpired,
} from "../repositories/invitesRepo.js";
import { insertOnboardingEvent } from "../repositories/onboardingEventsRepo.js";
import { ensureMembershipRole } from "../repositories/membershipsRepo.js";

const router = Router();

// POST /auth/invites/accept
// Body: { token, idToken }
router.post("/invites/accept", async (req, res) => {
  const { token, idToken } = req.body || {};
  if (!token || typeof token !== "string") return badRequest(res, "token required");
  if (!idToken || typeof idToken !== "string") return badRequest(res, "idToken required");

  const pepper = requireInvitePepper();
  const tokenHash = hashInviteToken(token, pepper);

  const invite = await getInviteByTokenHash(tokenHash);
  if (!invite) return res.status(404).json({ error: "invite_not_found" });

  if (invite.status !== "pending") {
    return res.status(409).json({ error: "invite_not_pending" });
  }

  const now = Date.now();
  if (new Date(invite.expires_at).getTime() <= now) {
    await markInviteExpired({ inviteId: invite.id });
    return res.status(410).json({ error: "invite_expired" });
  }

  let identity;
  try {
    identity = await verifyIdentityToken(idToken);
  } catch {
    return res.status(401).json({ error: "invalid_identity_token" });
  }

  const email = normalizeEmail(identity.email);
  if (!email || email !== invite.email) {
    return res.status(403).json({ error: "invite_email_mismatch" });
  }

  // We expect the user to already exist via Firebase auth -> upsert on /auth/session.
  // If they haven't created a session yet, we do not create local users here.
  // Instead, require them to authenticate via /auth/session first.
  const { getUserByEmail } = await import("../repositories/usersRepo.js");
  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(409).json({
      error: "user_not_provisioned",
      message: "Call /auth/session first to create a user session, then retry invite accept.",
      next: "/auth/session",
      requiresSession: true
    });
  }

  await ensureMembershipRole({ userId: user.id, orgId: invite.org_id, roleCode: invite.role_code || "ManagerCoach" });
  await markInviteAccepted({ inviteId: invite.id });

  await insertOnboardingEvent({
    orgId: invite.org_id,
    event_code: "INVITE_ACCEPTED",
    actor_user_id: user.id,
    meta: { email, coach_type: invite.coach_type },
  });

  return res.status(200).json({
    status: "accepted",
    orgId: invite.org_id,
    role: invite.role_code || "ManagerCoach",
    coach_type: invite.coach_type,
  });
});

export default router;
