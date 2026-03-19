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
    // Targeted cleanup to avoid stepping on other suites.
    await query(
      "DELETE FROM match_results WHERE match_id IN (SELECT id FROM matches WHERE home_team_id = $1 OR away_team_id = $1)",
      [teamId]
    );
    await query("DELETE FROM matches WHERE home_team_id = $1 OR away_team_id = $1", [teamId]);

    await query("DELETE FROM event_attendance WHERE event_id IN (SELECT id FROM events WHERE team_id = $1)", [teamId]);
    await query("DELETE FROM events WHERE team_id = $1", [teamId]);
    await query("DELETE FROM players WHERE team_id = $1", [teamId]);

    // Team must be deleted only after matches/players/events are gone.
    await query("DELETE FROM teams WHERE id = $1", [teamId]);

    // User/org are uniquely generated per test run; safe to remove by id.
    await query("DELETE FROM users WHERE id = $1", [userId]);
    await query("DELETE FROM organizations WHERE id = $1", [orgId]);
  });

  test("coach can create event and set/get attendance", async () => {
    const xUser = {
      id: userId,
      roles: ["ManagerCoach", "OrgAdmin"],
      activeOrgId: orgId,
      orgScopes: [orgId],
      teamScopes: [teamId]
    };

    let create;
    const now = new Date();
    const createPayload = {
      team_id: teamId,
      type: "practice",
      title: "Practice Session",
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    };
    try {
      create = await fetch(`${baseUrl}/admin/clubs/${orgId}/events`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user": JSON.stringify(xUser)
        },
        body: JSON.stringify(createPayload)
      });
    } catch (err) {
      console.error("[events-attendance] fetch failed for event create", {
        orgId,
        teamId,
        payload: createPayload,
        error: err.message
      });
      throw err;
    }

    if (create.status !== 201) {
      let bodyText = "<unavailable>";
      try {
        bodyText = await create.text();
      } catch (err) {
        bodyText = `<failed to read body: ${err.message}>`;
      }
      console.error("[events-attendance] unexpected event create response", {
        status: create.status,
        body: bodyText,
        orgId,
        teamId,
        payload: createPayload
      });
      assert.equal(create.status, 201);
    }

    const createBody = await create.json();
    assert.ok(createBody.event?.id);
    const eventId = createBody.event.id;

    const put = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xUser)
      },
      body: JSON.stringify({ player_id: playerId, status: "yes", notes: "Coming" })
    });

    if (put.status !== 200) {
      let bodyText = "<unavailable>";
      try {
        bodyText = await put.text();
      } catch (err) {
        bodyText = `<failed to read body: ${err.message}>`;
      }
      console.error("[events-attendance] unexpected attendance response", {
        status: put.status,
        body: bodyText,
        orgId,
        eventId,
        playerId
      });
      assert.equal(put.status, 200);
    }

    const putBody = await put.json();
    assert.equal(putBody.attendance.status, "present");
    assert.equal(putBody.attendance.player_id, playerId);

    const get = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
      headers: { "x-user": JSON.stringify(xUser) }
    });

    assert.equal(get.status, 200);
    const attendanceBody = await get.json();
    assert.ok(Array.isArray(attendanceBody.attendance));
    assert.equal(attendanceBody.attendance.length, 1);
    assert.equal(attendanceBody.attendance[0].player_id, playerId);
    assert.equal(attendanceBody.attendance[0].status, "present");
  });

  test("attendance update denied without permission", async () => {
    const xUser = {
      id: userId,
      roles: ["Viewer"],
      activeOrgId: orgId,
      orgScopes: [orgId],
      teamScopes: [teamId]
    };

    const now = new Date();
    const eventRes = await query(
      "INSERT INTO events (org_id, team_id, type, title, starts_at, ends_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [
        orgId,
        teamId,
        "practice",
        "DB Attendance Event",
        now.toISOString(),
        new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        userId
      ]
    );
    const eventId = eventRes.rows[0].id;

    const put = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify(xUser)
      },
      body: JSON.stringify({ player_id: playerId, status: "maybe" })
    });

    assert.equal(put.status, 403);
  });
}
