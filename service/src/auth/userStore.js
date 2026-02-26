const users = new Map();

export function upsertUserFromIdentity(identity) {
  const key = identity.uid;
  const existing = users.get(key) || {
    id: key,
    email: identity.email,
    name: identity.name || "",
    roles: ["Viewer"],
    permissions: ["dashboard.page.view"]
  };

  const updated = {
    ...existing,
    email: identity.email || existing.email,
    name: identity.name || existing.name
  };

  users.set(key, updated);
  return updated;
}

export function getUserById(id) {
  return users.get(id) || null;
}
