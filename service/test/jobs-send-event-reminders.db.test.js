import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { runMigrations } from "./helpers/dbTestUtils.js";
import { query } from "../src/db/client.js";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

test("POST /jobs/send-event-reminders logs upcoming events (DB)", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not set");
    return;
  }

  process.env.BOOTSTRAP_TOKEN = process.env.BOOTSTRAP_TOKEN || "test_bootstrap_token";

  await runMigrations();

  const orgId = "00000000-0000-0000-0000-0000000000a1";
  const userId = "00000000-0000-0000-0000-0000000000a2";
  const teamId = "00000000-0000-0000-0000-0000000000a3";

  // Minimal seed for org/user/team to satisfy FKs.
  await query(
    "INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
    [orgId, "Org A", "org-a"]
  );
  await query(
    "INSERT INTO users (id, external_uid, email, name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [userId, "u-reminders", "reminders@example.com", "Reminders"]
  );
  await query(
    "INSERT INTO teams (id, org_id, name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
    [teamId, orgId, "Team A"]
  );

  const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const later = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const e1 = await query(
    "INSERT INTO events (org_id, team_id, type, starts_at, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [orgId, teamId, "practice", soon, userId]
  );
  await query(
    "INSERT INTO events (org_id, team_id, type, starts_at, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [orgId, teamId, "practice", later, userId]
  );

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const res = await fetch(`${baseUrl}/jobs/send-event-reminders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bootstrap-token": process.env.BOOTSTRAP_TOKEN,
      },
      body: JSON.stringify({ windowHours: 24, dryRun: true }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.dryRun, true);

    const ids = (body.planned || []).map((p) => p.eventId);
    assert.ok(ids.includes(e1.rows[0].id), "should include the event within window");
  } finally {
    await new Promise((resolve) => server.close(resolve));

    // Cleanup just what we created.
    await query("DELETE FROM event_attendance WHERE event_id IN (SELECT id FROM events WHERE org_id = $1)", [orgId]);
    await query("DELETE FROM events WHERE org_id = $1", [orgId]);
    await query("DELETE FROM teams WHERE id = $1", [teamId]);
    await query("DELETE FROM users WHERE id = $1", [userId]);
    await query("DELETE FROM organizations WHERE id = $1", [orgId]);
  }
});
