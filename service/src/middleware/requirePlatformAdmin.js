// EPIC 1 PR2: temporary platform admin gate
//
// NOTE: This codebase has a stubby concept of "platform admin" today.
// `req.user.platformAdmin` may be present depending on session construction.
//
// TODO(PR3): formalize DB-backed platform claims/scopes and remove any allowlist fallback.

export function requirePlatformAdmin() {
  return (req, res, next) => {
    if (req.user?.platformAdmin === true) return next();

    // Temporary fallback for early staging: allowlist by email (centralized).
    const raw = process.env.PLATFORM_ADMIN_EMAILS || "";
    const allow = raw
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    if (allow.length && req.user?.email && allow.includes(String(req.user.email).toLowerCase())) {
      return next();
    }

    return res.status(403).json({ error: "forbidden", reason: "platform_admin_required" });
  };
}
