import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { seedTestOrgAndUsers, testUser, TEST_ORG_ID, DB_ENABLED } from "./helpers/dbTestUtils.js";
import { query } from "../src/db/client.js";

// DB-required: CI has DATABASE_URL now.
test("GET/POST /announcements (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not set");
    return;
  }

  await seedTestOrgAndUsers();

  // Ensure a team exists so matches test fixtures elsewhere don't fail on cascades.
  // (No direct FK needed for announcements, but we keep isolation minimal.)

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const xAdmin = testUser("u1", {
    roles: ["OrgAdmin"],
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    teamScopes: [],
    platformAdmin: false,
  });

  try {
    // Initially empty.
    const list0 = await fetch(`${baseUrl}/announcements`, {
      headers: { "x-user": JSON.stringify(xAdmin) },
    });
    assert.equal(list0.status, 200);
    const body0 = await list0.json();
    assert.ok(Array.isArray(body0.announcements));

    // Create.
    const create = await fetch(`${baseUrl}/announcements`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xAdmin),
      },
      body: JSON.stringify({ title: "Hello", body: "World" }),
    });

    assert.equal(create.status, 201);
    const created = await create.json();
    assert.ok(created.announcement?.id);

    // List includes created.
    const list1 = await fetch(`${baseUrl}/announcements`, {
      headers: { "x-user": JSON.stringify(xAdmin) },
    });
    assert.equal(list1.status, 200);
    const body1 = await list1.json();
    assert.ok(body1.announcements.some((a) => a.id === created.announcement.id));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    // Cleanup announcements for TEST_ORG_ID (keep users/org seeded for other tests).
    await query("DELETE FROM announcements WHERE org_id = $1", [TEST_ORG_ID]);
  }
});
