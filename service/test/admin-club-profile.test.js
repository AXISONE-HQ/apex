import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";

let server;
let baseUrl;

// Deterministic org id for DB-mode tests (organizations.id is UUID in Postgres).
const ORG_DEMO_ID = "00000000-0000-0000-0000-000000000001";

test.before(async () => {
  // DB-mode tests need a deterministic org row to exist.
  // In non-DB mode, repositories already provide demo orgs.
  if (process.env.DATABASE_URL) {
    const { query } = await import("../src/db/client.js");
    await query(
      `INSERT INTO organizations (id, name, slug, state_province, country, pulse_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [ORG_DEMO_ID, "Demo Club", "demo-org", "Ontario", "Canada", 82]
    );
  }

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

test("PATCH /admin/clubs/:orgId rejects invalid sport_type", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_DEMO_ID}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({
        id: "u1",
        roles: ["OrgAdmin"],
        permissions: ["admin.clubs.update"],
        orgScopes: [ORG_DEMO_ID],
      }),
    },
    body: JSON.stringify({ sport_type: "baseball" }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "invalid_sport_type");
});

test("PATCH /admin/clubs/:orgId rejects unknown patch fields", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_DEMO_ID}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({
        id: "u2",
        roles: ["OrgAdmin"],
        permissions: ["admin.clubs.update"],
        orgScopes: [ORG_DEMO_ID],
      }),
    },
    body: JSON.stringify({ logo_object_path: "club-logos/org_demo/evil.png" }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "bad_request");
});

test("PATCH /admin/clubs/:orgId denied when org scope missing", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_DEMO_ID}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({
        id: "u3",
        roles: ["OrgAdmin"],
        permissions: ["admin.clubs.update"],
        orgScopes: ["org_other"],
      }),
    },
    body: JSON.stringify({ sport_type: "basketball" }),
  });

  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "forbidden");
});
