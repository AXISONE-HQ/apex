import { Router } from "express";
import { verifyIdentityToken } from "../auth/firebase.js";
import { upsertUserFromIdentity } from "../repositories/usersRepo.js";
import { createSession, destroySession } from "../repositories/sessionsRepo.js";
import { ensureDefaultOrgMembership, resolveAuthzForUser } from "../repositories/authzRepo.js";
import { seedRbac } from "../db/seedRbac.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

const authMutationsLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyFn: (req) => req.ip || "unknown",
});

router.options("/session", (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (origin && (!allowedOrigins.length || allowedOrigins.includes(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  return res.sendStatus(204);
});

router.post("/session", authMutationsLimiter, async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: "idToken required" });
  }

  try {
    const identity = await verifyIdentityToken(idToken);
    const user = await upsertUserFromIdentity(identity);

    await seedRbac();
    const membership = await ensureDefaultOrgMembership({ userId: user.id });
    const authz = await resolveAuthzForUser({ userId: user.id, orgId: membership.orgId });

    const session = await createSession({
      userId: user.id,
      roles: authz.roles,
      permissions: authz.permissions,
      activeOrgId: authz.activeOrgId
    });

    const cookieSameSite = process.env.AUTH_COOKIE_SAMESITE || "none";
    const cookieSecure = process.env.AUTH_COOKIE_SECURE
      ? process.env.AUTH_COOKIE_SECURE === "true"
      : process.env.NODE_ENV !== "development";

    res.cookie("apex_session", session.sessionId, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: "/"
    });

    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name },
      memberships: [{ orgId: authz.activeOrgId || membership.orgId, roles: authz.roles }],
      permissions: authz.permissions,
      session: { expiresAt: session.expiresAt }
    });
  } catch {
    return res.status(401).json({ error: "invalid_identity_token" });
  }
});

router.post("/logout", authMutationsLimiter, async (req, res) => {
  await destroySession(req.cookies?.apex_session);
  res.clearCookie("apex_session");
  res.status(204).send();
});

router.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });

  res.status(200).json({
    user: { id: req.user.id, email: req.user.email, name: req.user.name },
    activeOrgId: req.user.activeOrgId || "org_demo",
    roles: req.user.roles || [],
    permissions: req.user.permissions || []
  });
});

export default router;
