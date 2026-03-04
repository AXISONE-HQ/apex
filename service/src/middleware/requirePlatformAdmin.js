// EPIC 1 PR3: DB-backed platform admin gate
//
// Source of truth: `req.user.isPlatformAdmin` (normalized at request auth middleware).
//
// Emergency fallback is DOUBLE-GATED (default OFF):
// - AUTH_ALLOW_PLATFORM_ADMIN_EMAIL_FALLBACK=true
// - PLATFORM_ADMIN_EMAILS set to a comma-separated allowlist
//
// TODO(PR3): remove fallback once platform claims are fully DB-backed everywhere.

export function requirePlatformAdmin() {
  return (req, res, next) => {
    if (req.user?.isPlatformAdmin === true) return next();

    const fallbackEnabled = process.env.AUTH_ALLOW_PLATFORM_ADMIN_EMAIL_FALLBACK === "true";
    if (fallbackEnabled) {
      const raw = process.env.PLATFORM_ADMIN_EMAILS || "";
      const allow = raw
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);

      if (allow.length && req.user?.email && allow.includes(String(req.user.email).toLowerCase())) {
        return next();
      }
    }

    return res.status(403).json({ error: "forbidden", reason: "platform_admin_required" });
  };
}
