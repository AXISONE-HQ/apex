import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { DB_ENABLED, seedTestOrgAndUsers, testUser, TEST_ORG_ID } from "./helpers/dbTestUtils.js";
import { query } from "../src/db/client.js";

// DB-required: CI has DATABASE_URL now.
test("GET /events/:id scoping (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not set");
    return;
  }

  await seedTestOrgAndUsers();

  const teamAllowed = "00000000-0000-0000-0000-000000000201";
  const teamOther = "00000000-0000-0000-0000-000000000202";
  const otherOrg = "00000000-0000-0000-0000-000000000299";

  await query(
    "INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
    [otherOrg, "Other Org", "other-org"]
  );

  await query(
    "INSERT INTO teams (id, org_id, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
    [teamAllowed, TEST_ORG_ID, "Allowed Team"]
  );
  await query(
    "INSERT INTO teams (id, org_id, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
    [teamOther, TEST_ORG_ID, "Other Team"]
  );

  const eventAllowed = await query(
    "INSERT INTO events (org_id, team_id, type, title, starts_at) VALUES ($1,$2,$3,$4, NOW()) RETURNING id",
    [TEST_ORG_ID, teamAllowed, "practice", "DB Event Allowed"]
  );

  const eventOtherOrg = await query(
    "INSERT INTO events (org_id, team_id, type, title, starts_at) VALUES ($1,$2,$3,$4, NOW()) RETURNING id",
    [otherOrg, teamAllowed, "practice", "DB Event Other Org"]
  );

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const xScopedViewer = testUser("u2", {
    roles: ["Viewer"],
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    teamScopes: [teamAllowed],
    platformAdmin: false,
  });

  const xTeamRestricted = testUser("u3", {
    roles: ["Viewer"],
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    teamScopes: [teamOther],
    platformAdmin: false,
  });

  try {
    // out-of-org should look not found (404)
    const r404 = await fetch(`${baseUrl}/events/${eventOtherOrg.rows[0].id}`, {
      headers: { "x-user": JSON.stringify(xScopedViewer) },
    });
    assert.equal(r404.status, 404);

    // in-org but team forbidden -> 403 when teamScopes non-empty
    const r403 = await fetch(`${baseUrl}/events/${eventAllowed.rows[0].id}`, {
      headers: { "x-user": JSON.stringify(xTeamRestricted) },
    });
    assert.equal(r403.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await query("DELETE FROM event_attendance WHERE event_id = $1", [eventAllowed.rows[0].id]);
    await query("DELETE FROM events WHERE id = $1", [eventAllowed.rows[0].id]);
    await query("DELETE FROM events WHERE id = $1", [eventOtherOrg.rows[0].id]);
    await query("DELETE FROM teams WHERE id = $1", [teamAllowed]);
    await query("DELETE FROM teams WHERE id = $1", [teamOther]);
    await query("DELETE FROM organizations WHERE id = $1", [otherOrg]);
  }
});
