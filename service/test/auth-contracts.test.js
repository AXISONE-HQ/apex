import test from "node:test";
import assert from "node:assert/strict";

process.env.AUTH_ALLOW_INSECURE_TEST_TOKENS = "true";

import app from "../src/server.js";

let server;
let baseUrl;

const DB_ENABLED = Boolean(process.env.DATABASE_URL);
const TEST_ORG_ID = DB_ENABLED ? "00000000-0000-0000-0000-000000000001" : "org_demo";

const TEST_USER_UUIDS = {
  u1: "00000000-0000-0000-0000-000000000011",
  u2: "00000000-0000-0000-0000-000000000012",
  u3: "00000000-0000-0000-0000-000000000013",
  u4: "00000000-0000-0000-0000-000000000014",
  u5: "00000000-0000-0000-0000-000000000015",
  u6: "00000000-0000-0000-0000-000000000016",
  u7: "00000000-0000-0000-0000-000000000017",
  u8: "00000000-0000-0000-0000-000000000018",
  u9: "00000000-0000-0000-0000-000000000019",
  u10: "00000000-0000-0000-0000-000000000020"
};

function testUserId(id) {
  if (!DB_ENABLED) return id;
  return TEST_USER_UUIDS[id] || id;
}

test.before(async () => {
  if (DB_ENABLED) {
    const { query } = await import("../src/db/client.js");
    const { runMigrations } = await import("../src/db/migrate.js");

    await runMigrations();
    await query(
      "INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
      [TEST_ORG_ID, "Test Org", "test-org"]
    );

    for (const [label, id] of Object.entries(TEST_USER_UUIDS)) {
      await query(
        "INSERT INTO users (id, external_uid, email, name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        [id, `ext_${label}`, `${label}@example.com`, `User ${label.slice(1)}`]
      );
    }
  }

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("POST /auth/session returns 200", async () => {
  const res = await fetch(`${baseUrl}/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: "test:demo@example.com" })
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.user.email, "demo@example.com");
  assert.ok(res.headers.get("set-cookie")?.includes("apex_session="));
});

test("GET /auth/me returns 401 without session", async () => {
  const res = await fetch(`${baseUrl}/auth/me`);
  assert.equal(res.status, 401);
});

test("GET /healthz returns 200", async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

test("GET /readyz returns 200", async () => {
  const res = await fetch(`${baseUrl}/readyz`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ready");
  assert.equal(body.checks.database.ok, true);
});

test("GET /secure/teams returns 403 when role lacks permission", async () => {
  const res = await fetch(`${baseUrl}/secure/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: testUserId("u1"), roles: ["NoRole"] })
    }
  });
  assert.equal(res.status, 403);
});

test("GET /secure/teams returns 200 with required permission", async () => {
  const res = await fetch(`${baseUrl}/secure/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: testUserId("u2"), roles: ["ManagerCoach"] })
    }
  });
  assert.equal(res.status, 200);
});

test("GET scoped org route returns 403 when org scope missing", async () => {
  const res = await fetch(`${baseUrl}/secure/org/org_2/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: testUserId("u3"), roles: ["ManagerCoach"], orgScopes: ["org_1"] })
    }
  });
  assert.equal(res.status, 403);
});

test("GET scoped org route returns 200 when org scope matches", async () => {
  const res = await fetch(`${baseUrl}/secure/org/org_1/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: testUserId("u4"), roles: ["ManagerCoach"], orgScopes: ["org_1"] })
    }
  });
  assert.equal(res.status, 200);
});

test("POST /teams creates team with permission", async () => {
  const res = await fetch(`${baseUrl}/teams`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: testUserId("u5"), roles: ["ManagerCoach"], activeOrgId: TEST_ORG_ID })
    },
    body: JSON.stringify({ name: "Sharks" })
  });
  assert.equal(res.status, 201);
});

test("POST /players denied without create permission", async () => {
  const res = await fetch(`${baseUrl}/players`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: testUserId("u6"), roles: ["Viewer"], activeOrgId: TEST_ORG_ID })
    },
    body: JSON.stringify({ firstName: "A", lastName: "B" })
  });
  assert.equal(res.status, 403);
});

test("PATCH /teams/:id updates team", async () => {
  const create = await fetch(`${baseUrl}/teams`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: testUserId("u7"), roles: ["OrgAdmin"], activeOrgId: TEST_ORG_ID })
    },
    body: JSON.stringify({ name: "Lions" })
  });
  const created = await create.json();

  const patch = await fetch(`${baseUrl}/teams/${created.id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: testUserId("u7"), roles: ["OrgAdmin"], activeOrgId: TEST_ORG_ID })
    },
    body: JSON.stringify({ name: "Lions FC" })
  });

  assert.equal(patch.status, 200);
});

test("DELETE /players/:id requires deactivate permission", async () => {
  const create = await fetch(`${baseUrl}/players`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: testUserId("u8"), roles: ["OrgAdmin"], activeOrgId: TEST_ORG_ID })
    },
    body: JSON.stringify({ firstName: "Del", lastName: "Test" })
  });
  const created = await create.json();

  const del = await fetch(`${baseUrl}/players/${created.id}`, {
    method: "DELETE",
    headers: {
      "x-user": JSON.stringify({ id: testUserId("u9"), roles: ["Viewer"], activeOrgId: TEST_ORG_ID })
    }
  });

  assert.equal(del.status, 403);
});

test("POST /matches/:id/result submits match result", async () => {
  const makeTeam = async (name) => {
    const res = await fetch(`${baseUrl}/teams`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user": JSON.stringify({ id: testUserId("u10"), roles: ["OrgAdmin"], activeOrgId: TEST_ORG_ID })
      },
      body: JSON.stringify({ name })
    });
    return res.json();
  };

  const t1 = await makeTeam("A");
  const t2 = await makeTeam("B");

  const matchRes = await fetch(`${baseUrl}/matches`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: testUserId("u10"), roles: ["OrgAdmin"], activeOrgId: TEST_ORG_ID })
    },
    body: JSON.stringify({ homeTeamId: t1.id, awayTeamId: t2.id })
  });
  const match = await matchRes.json();

  const submit = await fetch(`${baseUrl}/matches/${match.id}/result`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: testUserId("u10"), roles: ["OrgAdmin"], activeOrgId: TEST_ORG_ID })
    },
    body: JSON.stringify({ homeScore: 2, awayScore: 1 })
  });

  assert.equal(submit.status, 201);
});
