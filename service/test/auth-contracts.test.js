import test from "node:test";
import assert from "node:assert/strict";

process.env.AUTH_ALLOW_INSECURE_TEST_TOKENS = "true";

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

test("GET /secure/teams returns 403 when role lacks permission", async () => {
  const res = await fetch(`${baseUrl}/secure/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: "u1", roles: ["NoRole"] })
    }
  });
  assert.equal(res.status, 403);
});

test("GET /secure/teams returns 200 with required permission", async () => {
  const res = await fetch(`${baseUrl}/secure/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: "u2", roles: ["ManagerCoach"] })
    }
  });
  assert.equal(res.status, 200);
});

test("GET scoped org route returns 403 when org scope missing", async () => {
  const res = await fetch(`${baseUrl}/secure/org/org_2/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: "u3", roles: ["ManagerCoach"], orgScopes: ["org_1"] })
    }
  });
  assert.equal(res.status, 403);
});

test("GET scoped org route returns 200 when org scope matches", async () => {
  const res = await fetch(`${baseUrl}/secure/org/org_1/teams`, {
    headers: {
      "x-user": JSON.stringify({ id: "u4", roles: ["ManagerCoach"], orgScopes: ["org_1"] })
    }
  });
  assert.equal(res.status, 200);
});
