import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";

const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000000101";
const USER_COACH_1 = "00000000-0000-0000-0000-000000000201";
const USER_RANDOM = "00000000-0000-0000-0000-000000000301";

function xUser({ id, roles, permissions, orgScopes }) {
  return {
    id,
    roles,
    permissions,
    orgScopes,
  };
}

test.before(async () => {
  if (process.env.DATABASE_URL) {
    const { query } = await import("../src/db/client.js");

    // Orgs
    await query(
      `INSERT INTO organizations (id, name, slug, state_province, country, pulse_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [ORG_1, "Org One", "org-one", "Ontario", "Canada", 50]
    );
    await query(
      `INSERT INTO organizations (id, name, slug, state_province, country, pulse_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [ORG_2, "Org Two", "org-two", "Ontario", "Canada", 50]
    );

    // Users
    await query(
      `INSERT INTO users (id, external_uid, email, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [USER_ORGADMIN_1, "ext-admin-1", "admin1@example.com", "Admin 1"]
    );

    await query(
      `INSERT INTO users (id, external_uid, email, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [USER_COACH_1, "ext-coach-1", "coach1@example.com", "Coach 1"]
    );

    await query(
      `INSERT INTO users (id, external_uid, email, name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [USER_RANDOM, "ext-random-1", "random1@example.com", "Random 1"]
    );

    // Memberships + roles (canonical schema)
    const { ensureMembershipRole } = await import("../src/repositories/membershipsRepo.js");

    await ensureMembershipRole({ userId: USER_ORGADMIN_1, orgId: ORG_1, roleCode: "OrgAdmin" });
    await ensureMembershipRole({ userId: USER_COACH_1, orgId: ORG_1, roleCode: "ManagerCoach" });
    await ensureMembershipRole({ userId: USER_RANDOM, orgId: ORG_1, roleCode: "Viewer" });
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

test("OrgAdmin can create team in org", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({
          id: USER_ORGADMIN_1,
          roles: ["OrgAdmin"],
          permissions: [],
          orgScopes: [ORG_1],
        })
      ),
    },
    body: JSON.stringify({
      name: "U14 AAA",
      season_year: 2026,
    }),
  });

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.item);
  assert.equal(body.item.org_id, ORG_1);
  assert.equal(body.item.name, "U14 AAA");
  assert.equal(body.item.season_year, 2026);
  assert.equal(body.item.is_archived, false);
});

test("OrgAdmin cannot create team in other org", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/teams`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({
          id: USER_ORGADMIN_1,
          roles: ["OrgAdmin"],
          permissions: [],
          orgScopes: [ORG_1],
        })
      ),
    },
    body: JSON.stringify({ name: "U14 AA", season_year: 2026 }),
  });

  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "forbidden");
});

test("Create returns 409 team_already_exists on (org, season, name) duplicate", async () => {
  const payload = { name: "U16 A", season_year: 2026 };

  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: USER_ORGADMIN_1,
        roles: ["OrgAdmin"],
        permissions: [],
        orgScopes: [ORG_1],
      })
    ),
  };

  const res1 = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(payload),
  });
  assert.equal(res1.status, 201);

  const res2 = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(payload),
  });

  assert.equal(res2.status, 409);
  const body2 = await res2.json();
  assert.equal(body2.error, "team_already_exists");
});

test("List excludes archived by default; includeArchived=true includes archived", async () => {
  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: USER_ORGADMIN_1,
        roles: ["OrgAdmin"],
        permissions: [],
        orgScopes: [ORG_1],
      })
    ),
  };

  // Create an archived team
  const createRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ name: "Archived Team", season_year: 2026 }),
  });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()).item;

  const patchRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams/${created.id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ is_archived: true }),
  });
  assert.equal(patchRes.status, 200);

  const listDefault = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, { headers: h });
  assert.equal(listDefault.status, 200);
  const listDefaultBody = await listDefault.json();
  assert.ok(Array.isArray(listDefaultBody.items));
  assert.equal(
    listDefaultBody.items.some((t) => t.id === created.id),
    false
  );

  const listIncl = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams?includeArchived=true`, { headers: h });
  assert.equal(listIncl.status, 200);
  const listInclBody = await listIncl.json();
  assert.equal(
    listInclBody.items.some((t) => t.id === created.id),
    true
  );
});

test("PATCH rejects unknown fields", async () => {
  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: USER_ORGADMIN_1,
        roles: ["OrgAdmin"],
        permissions: [],
        orgScopes: [ORG_1],
      })
    ),
  };

  const createRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ name: "Unknown Patch Team", season_year: 2026 }),
  });
  assert.equal(createRes.status, 201);
  const teamId = (await createRes.json()).item.id;

  const patchRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams/${teamId}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ evil: true }),
  });

  assert.equal(patchRes.status, 400);
  const body = await patchRes.json();
  assert.equal(body.error, "bad_request");
});

test("Head coach validation: not member => 400 head_coach_not_member", async () => {
  if (!process.env.DATABASE_URL) {
    // Only meaningful in DB-mode.
    return;
  }

  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: USER_ORGADMIN_1,
        roles: ["OrgAdmin"],
        permissions: [],
        orgScopes: [ORG_1],
      })
    ),
  };

  // Create a user but no membership.
  const NON_MEMBER_USER = "00000000-0000-0000-0000-000000000401";
  const { query } = await import("../src/db/client.js");
  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [NON_MEMBER_USER, "ext-non-member", "nonmember@example.com", "Non Member"]
  );

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      name: "Team With NonMember Coach",
      season_year: 2026,
      head_coach_user_id: NON_MEMBER_USER,
    }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "head_coach_not_member");
});

test("Head coach validation: wrong role => 400 head_coach_role_not_allowed", async () => {
  if (!process.env.DATABASE_URL) return;

  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: USER_ORGADMIN_1,
        roles: ["OrgAdmin"],
        permissions: [],
        orgScopes: [ORG_1],
      })
    ),
  };

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      name: "Team With Wrong Role Coach",
      season_year: 2026,
      head_coach_user_id: USER_RANDOM,
    }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "head_coach_role_not_allowed");
});

test("PATCH can unassign head coach with null", async () => {
  if (!process.env.DATABASE_URL) return;

  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: USER_ORGADMIN_1,
        roles: ["OrgAdmin"],
        permissions: [],
        orgScopes: [ORG_1],
      })
    ),
  };

  const createRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      name: "Team With Coach",
      season_year: 2026,
      head_coach_user_id: USER_COACH_1,
    }),
  });

  assert.equal(createRes.status, 201);
  const team = (await createRes.json()).item;
  assert.equal(team.head_coach_user_id, USER_COACH_1);

  const patchRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams/${team.id}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ head_coach_user_id: null }),
  });

  assert.equal(patchRes.status, 200);
  const updated = (await patchRes.json()).item;
  assert.equal(updated.head_coach_user_id, null);
});

test("PATCH returns 404 team_not_found for missing team in org", async () => {
  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: USER_ORGADMIN_1,
        roles: ["OrgAdmin"],
        permissions: [],
        orgScopes: [ORG_1],
      })
    ),
  };

  const missingTeamId = "00000000-0000-0000-0000-000000009999";

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams/${missingTeamId}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ name: "Does not matter" }),
  });

  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, "team_not_found");
});
