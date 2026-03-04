import test from "node:test";
import assert from "node:assert/strict";

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

test("POST /admin/clubs returns 403 when not platform admin", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({
        id: "u1",
        email: "user@example.com",
        roles: ["OrgAdmin"],
        orgScopes: ["org_demo"],
      }),
    },
    body: JSON.stringify({
      name: "Montreal Elite",
      sport_type: "basketball",
      director_email: "director@example.com",
    }),
  });

  assert.equal(res.status, 403);
});

test("POST /admin/clubs returns 404 when director user not found", async () => {
  process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";

  const res = await fetch(`${baseUrl}/admin/clubs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify({
        id: "u_admin",
        email: "admin@example.com",
        platformAdmin: true,
      }),
    },
    body: JSON.stringify({
      name: "Montreal Elite",
      sport_type: "basketball",
      director_email: "director@example.com",
      subscription_plan: "trial",
      location: { country: "CA", state_province: "QC" },
    }),
  });

  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, "director_user_not_found");
});
