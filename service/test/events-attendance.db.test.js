import test from "node:test";
import assert from "node:assert/strict";

// DB-required test file: skip if DATABASE_URL not set.
if (!process.env.DATABASE_URL) {
  test("events/attendance db suite skipped (DATABASE_URL not set)", () => {
    assert.ok(true);
  });
} else {
  const { randomUUID } = await import("node:crypto");
  const { default: app } = await import("../src/server.js");
  const { runMigrations } = await import("../src/db/migrate.js");
  const { query } = await import("../src/db/client.js");

  let server;
  let baseUrl;

  const orgId = randomUUID();
  const userId = randomUUID();
  const teamId = randomUUID();
  const playerId = randomUUID();

  test.before(async () => {
    await runMigrations();

    // Minimal fixtures
    await query("INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3)", [orgId, "Org", `org-${orgId.slice(0, 8)}`]);
    await query(
      "INSERT INTO users (id, external_uid, email, name) VALUES ($1,$2,$3,$4)",
      [userId, `ext_${userId.slice(0, 8)}`, `u-${userId.slice(0, 8)}@e.com`, "User"]
    );
    await query("INSERT INTO teams (id, org_id, name) VALUES ($1,$2,$3)", [teamId, orgId, "Team"]);
    await query(
      "INSERT INTO players (id, org_id, team_id, first_name, last_name, email) VALUES ($1,$2,$3,$4,$5,$6)",
      [playerId, orgId, teamId, "P", "1", `p-${playerId.slice(0, 8)}@e.com`]
    );

    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  test.after(async () => {
    await new Promise((resolve) => server.close(resolve));

    // Cleanup (delete children before parents)
    await query("DELETE FROM match_results");
    await query("DELETE FROM matches");
    await query("DELETE FROM event_attendance");
    await query("DELETE FROM events");
    await query("DELETE FROM players");
    await query("DELETE FROM teams");
    await query("DELETE FROM membership_roles");
    await query("DELETE FROM memberships");
    await query("DELETE FROM sessions");
    await query("DELETE FROM organizations");
    await query("DELETE FROM users");
  });

  test("coach can create event and set/get attendance", async () => {
    const xUser = {
      id: userId,
      roles: ["ManagerCoach"],
      activeOrgId: orgId,
      orgScopes: [orgId],
      teamScopes: [teamId]
    };

    const create = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xUser)
      },
      body: JSON.stringify({ teamId, type: "practice", startsAt: new Date().toISOString() })
    });

    assert.equal(create.status, 201);
    const event = await create.json();
    assert.ok(event.id);

    const put = await fetch(`${baseUrl}/events/${event.id}/attendance/${playerId}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xUser)
      },
      body: JSON.stringify({ status: "yes", note: "Coming" })
    });

    assert.equal(put.status, 200);
    const putBody = await put.json();
    assert.equal(putBody.status, "yes");

    const get = await fetch(`${baseUrl}/events/${event.id}/attendance`, {
      headers: { "x-user": JSON.stringify(xUser) }
    });

    assert.equal(get.status, 200);
    const body = await get.json();
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].player_id, playerId);
  });

  test("attendance update denied without permission", async () => {
    const xUser = {
      id: userId,
      roles: ["Viewer"],
      activeOrgId: orgId,
      orgScopes: [orgId],
      teamScopes: [teamId]
    };

    const eventRes = await query(
      "INSERT INTO events (org_id, team_id, type, starts_at, created_by) VALUES ($1,$2,$3,NOW(),$4) RETURNING id",
      [orgId, teamId, "practice", userId]
    );
    const eventId = eventRes.rows[0].id;

    const put = await fetch(`${baseUrl}/events/${eventId}/attendance/${playerId}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xUser)
      },
      body: JSON.stringify({ status: "maybe" })
    });

    assert.equal(put.status, 403);
  });
}
