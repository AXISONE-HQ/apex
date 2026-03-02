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

test("POST /admin/clubs/onboarding returns 401 without session", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/onboarding`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "A", slug: "a", country: "CA" })
  });

  assert.equal(res.status, 401);
});

test("POST /admin/clubs/onboarding returns 403 without create permission", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/onboarding`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: "u1", roles: ["Viewer"], scopes: ["platform"] })
    },
    body: JSON.stringify({ name: "A", slug: "a", country: "CA" })
  });

  assert.equal(res.status, 403);
});

test("POST /admin/clubs/onboarding returns 201 with required fields", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/onboarding`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({ id: "u2", roles: ["AxisOneAdmin"], scopes: ["platform"] })
    },
    body: JSON.stringify({ name: "My Club", slug: "my-club", country: "CA", state_province: "ON" })
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.name, "My Club");
  assert.equal(body.slug, "my-club");
  assert.equal(body.country, "CA");
  assert.equal(body.state_province, "ON");
});

test("POST /admin/clubs/onboarding returns 409 when slug is taken (memory mode)", async () => {
  const headers = {
    "content-type": "application/json",
    "x-user": JSON.stringify({ id: "u3", roles: ["AxisOneAdmin"], scopes: ["platform"] })
  };

  const first = await fetch(`${baseUrl}/admin/clubs/onboarding`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Club 1", slug: "dup-slug", country: "CA" })
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${baseUrl}/admin/clubs/onboarding`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Club 2", slug: "dup-slug", country: "CA" })
  });
  assert.equal(second.status, 409);
});
