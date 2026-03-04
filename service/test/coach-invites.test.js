import test from "node:test";
import assert from "node:assert/strict";

process.env.AUTH_ALLOW_INSECURE_TEST_TOKENS = "true";
process.env.INVITE_TOKEN_PEPPER = "pepper_for_tests";

import app from "../src/server.js";

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("OrgAdmin can invite within org (DB-required)", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL not set");
    return;
  }

  const { query } = await import("../src/db/client.js");
  const { runMigrations } = await import("../src/db/migrate.js");
  await runMigrations();

  const orgId = "00000000-0000-0000-0000-0000000000b1";
  const directorId = "00000000-0000-0000-0000-0000000000b2";

  await query(
    "INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING",
    [orgId, "Invite Org", "invite-org"]
  );
  await query(
    "INSERT INTO users (id, external_uid, email, name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING",
    [directorId, "ext_dir", "director@example.com", "Director"]
  );

  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/coaches/invite`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({
        id: directorId,
        email: "director@example.com",
        roles: ["OrgAdmin"],
        orgScopes: [orgId],
      }),
    },
    body: JSON.stringify({
      email: "coach@club.com",
      coach_type: "head",
      team_ids: [],
    }),
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.inviteId);
});

test("OrgAdmin cannot invite outside org", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/org_other/coaches/invite`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({
        id: "u1",
        email: "director@example.com",
        roles: ["OrgAdmin"],
        orgScopes: ["org_demo"],
      }),
    },
    body: JSON.stringify({ email: "coach@club.com", coach_type: "head", team_ids: [] }),
  });

  assert.equal(res.status, 403);
});

test("Accept returns 409 user_not_provisioned when user not provisioned", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("DATABASE_URL not set");
    return;
  }

  const { query } = await import("../src/db/client.js");
  const { runMigrations } = await import("../src/db/migrate.js");
  await runMigrations();

  const orgId = "00000000-0000-0000-0000-0000000000c1";
  const creatorId = "00000000-0000-0000-0000-0000000000c2";

  await query(
    "INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING",
    [orgId, "Invite Org2", "invite-org2"]
  );

  // created_by_user_id FK requires an existing user
  await query(
    "INSERT INTO users (id, external_uid, email, name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING",
    [creatorId, "ext_creator", "admin@example.com", "Admin"]
  );

  // Insert invite directly (simulate admin create). Token hash uses pepper.
  const crypto = await import("node:crypto");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken + process.env.INVITE_TOKEN_PEPPER).digest("hex");

  await query(
    `INSERT INTO organization_invites (org_id, email, role_code, coach_type, team_ids, token_hash, expires_at, status, created_by_user_id)
     VALUES ($1, $2, 'ManagerCoach', 'head', '[]'::jsonb, $3, NOW() + interval '48 hours', 'pending', $4)`,
    [orgId, "coach@club.com", tokenHash, creatorId]
  );

  const res = await fetch(`${baseUrl}/auth/invites/accept`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken, idToken: "test:coach@club.com" }),
  });

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.error, "user_not_provisioned");
  assert.equal(body.requiresSession, true);
});
