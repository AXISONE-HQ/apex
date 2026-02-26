import { can } from "../authz/engine.js";

export function requirePermission(permission, scopeResolver = null) {
  return async (req, res, next) => {
    const scope = scopeResolver ? await scopeResolver(req) : null;
    const decision = can({
      user: req.user,
      roles: req.user?.roles || [],
      permissions: req.user?.permissions || [],
      permission,
      scope
    });

    if (!decision.allow) {
      return res.status(403).json({ error: "forbidden", permission, scope, reason: decision.reason });
    }
    next();
  };
}
