import { rolePermissions } from "../config/rbac.js";

function wildcardMatch(grant, permission) {
  if (grant === "*") return true;
  if (grant.endsWith(".*")) {
    const prefix = grant.slice(0, -1);
    return permission.startsWith(prefix);
  }
  return grant === permission;
}

function scopeAllowed(user, scope) {
  if (!scope) return true;
  if (!user) return false;

  if (scope.type === "platform") return (user.scopes || []).includes("platform");
  if (scope.type === "organization") return (user.orgScopes || []).includes(scope.id);
  if (scope.type === "team") return (user.teamScopes || []).includes(scope.id);
  if (scope.type === "self") return String(user.id) === String(scope.id);

  return false;
}

export function can({ roles = [], permission, scope = null, user = null, permissions = null }) {
  if (permissions && permissions.includes(permission) && scopeAllowed(user, scope)) {
    return { allow: true, reason: "granted_by:explicit_permission" };
  }

  const grants = new Set();
  for (const role of roles) {
    for (const grant of rolePermissions[role] || []) grants.add(grant);
  }

  for (const grant of grants) {
    if (wildcardMatch(grant, permission)) {
      if (!scopeAllowed(user, scope)) return { allow: false, reason: "scope_denied" };
      return { allow: true, reason: `granted_by:${grant}` };
    }
  }

  return { allow: false, reason: "missing_permission" };
}
