import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { DB_ENABLED, seedTestOrgAndUsers, testUser, TEST_ORG_ID } from "./helpers/dbTestUtils.js";
import { query } from "../src/db/client.js";

// DB-required: run in CI.
test("GET/POST /teams/:teamId/messages (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not set");
    return;
  }

  await seedTestOrgAndUsers();

  const teamId = "00000000-0000-0000-0000-000000000101";
  await query(
    "INSERT INTO teams (id, org_id, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
    [teamId, TEST_ORG_ID, "Messages Team"]
  );

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const xCoach = testUser("u2", {
    roles: ["ManagerCoach"],
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    teamScopes: [teamId],
    platformAdmin: false,
  });

  const xOrgAdminNoTeamScopes = testUser("u1", {
    roles: ["OrgAdmin"],
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    teamScopes: [],
    platformAdmin: false,
  });

  const xViewer = testUser("u3", {
    roles: ["Viewer"],
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    teamScopes: [teamId],
    platformAdmin: false,
  });

  const xNoTeamScope = testUser("u4", {
    roles: ["Viewer"],
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    teamScopes: ["00000000-0000-0000-0000-000000000999"],
    platformAdmin: false,
  });

  try {
    // viewer can read
    const r0 = await fetch(`${baseUrl}/teams/${teamId}/messages`, {
      headers: { "x-user": JSON.stringify(xViewer) },
    });
    assert.equal(r0.status, 200);
    const b0 = await r0.json();
    assert.ok(Array.isArray(b0.messages));

    // coach can post
    const c1 = await fetch(`${baseUrl}/teams/${teamId}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xCoach),
      },
      body: JSON.stringify({ body: "hello team" }),
    });
    assert.equal(c1.status, 201);
    const created = await c1.json();
    assert.ok(created.message?.id);

    // OrgAdmin with empty teamScopes should still work (org-wide role).
    const adminRead = await fetch(`${baseUrl}/teams/${teamId}/messages`, {
      headers: { "x-user": JSON.stringify(xOrgAdminNoTeamScopes) },
    });
    assert.equal(adminRead.status, 200);

    const adminPost = await fetch(`${baseUrl}/teams/${teamId}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xOrgAdminNoTeamScopes),
      },
      body: JSON.stringify({ body: "admin msg" }),
    });
    assert.equal(adminPost.status, 201);

    // viewer without team scope -> 403
    const rForbidden = await fetch(`${baseUrl}/teams/${teamId}/messages`, {
      headers: { "x-user": JSON.stringify(xNoTeamScope) },
    });
    assert.equal(rForbidden.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await query("DELETE FROM team_messages WHERE team_id = $1", [teamId]);
    await query("DELETE FROM teams WHERE id = $1", [teamId]);
  }
});
