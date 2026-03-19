import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const USER_ORGADMIN = "00000000-0000-0000-0000-000000000101";
const USER_COACH = "00000000-0000-0000-0000-000000000201";

let server;
let baseUrl;
const RUN_ID = Date.now().toString(36);
let seasonCounter = 1;

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");
  await query(
    `INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [ORG_1, "Seasons Test Org 1", "seasons-test-org-1"]
  );
  await query(
    `INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [ORG_2, "Seasons Test Org 2", "seasons-test-org-2"]
  );
}

function xUser({ id, roles, orgScopes }) {
  return { id, roles, permissions: [], orgScopes };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

async function createSeason(orgId, user, overrides = {}) {
  const payload = {
    label: `Season ${RUN_ID}-${seasonCounter++}`,
    year: 2026,
    ...overrides,
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/seasons`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  return res;
}

async function listSeasons(orgId, user, query = "") {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/seasons${query}`, {
    headers: headersFor(user),
  });
  return res;
}

async function getSeason(orgId, user, seasonId) {
  return fetch(`${baseUrl}/admin/clubs/${orgId}/seasons/${seasonId}`, {
    headers: headersFor(user),
  });
}

async function patchSeason(orgId, user, seasonId, body) {
  return fetch(`${baseUrl}/admin/clubs/${orgId}/seasons/${seasonId}`, {
    method: "PATCH",
    headers: headersFor(user),
    body: JSON.stringify(body),
  });
}

const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
const adminOrg2 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
const coachUser = xUser({ id: USER_COACH, roles: ["Coach"], orgScopes: [ORG_1] });

test.before(async () => {
  await seedDb();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

test("Org admin can create/list/get seasons", async () => {
  const res = await createSeason(ORG_1, adminUser, { year: 2027, starts_on: "2027-03-01" });
  assert.equal(res.status, 201, `create failed ${res.status}`);
  const body = await res.json();
  assert.ok(body.item?.id, "season id missing");
  assert.equal(body.item.status, "draft");
  assert.equal(body.item.year, 2027);

  const listRes = await listSeasons(ORG_1, adminUser);
  assert.equal(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(list.items.length >= 1);
  const created = list.items.find((item) => item.id === body.item.id);
  assert.ok(created, "created season missing from list");

  const getRes = await getSeason(ORG_1, adminUser, body.item.id);
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json();
  assert.equal(fetched.item.id, body.item.id);
});

test("RBAC forbids non OrgAdmin", async () => {
  const res = await createSeason(ORG_1, coachUser);
  assert.equal(res.status, 403);
});

test("duplicate labels conflict", async () => {
  const createOne = await createSeason(ORG_1, adminUser, { label: `Season ${RUN_ID}-dup` });
  assert.equal(createOne.status, 201);
  const duplicate = await createSeason(ORG_1, adminUser, { label: `Season ${RUN_ID}-dup` });
  assert.equal(duplicate.status, 409);
});

test("status lifecycle transitions", async () => {
  const res = await createSeason(ORG_1, adminUser);
  const seasonId = (await res.json()).item.id;

  const activate = await patchSeason(ORG_1, adminUser, seasonId, { status: "active" });
  assert.equal(activate.status, 200);
  const active = await activate.json();
  assert.equal(active.item.status, "active");

  const complete = await patchSeason(ORG_1, adminUser, seasonId, { status: "completed" });
  assert.equal(complete.status, 200);
  assert.equal((await complete.json()).item.status, "completed");

  const archive = await patchSeason(ORG_1, adminUser, seasonId, { status: "archived" });
  assert.equal(archive.status, 200);
  assert.equal((await archive.json()).item.status, "archived");

  const revive = await patchSeason(ORG_1, adminUser, seasonId, { status: "active" });
  assert.equal(revive.status, 400);
  const reviveBody = await revive.json();
  assert.equal(reviveBody.message, "invalid_status_transition");
});

test("date validation and updates", async () => {
  const res = await createSeason(ORG_1, adminUser, {
    starts_on: "2026-01-01",
    ends_on: "2026-06-01",
  });
  assert.equal(res.status, 201);
  const seasonId = (await res.json()).item.id;

  const update = await patchSeason(ORG_1, adminUser, seasonId, {
    label: "Updated Season",
    year: 2028,
    starts_on: "2026-02-01",
  });
  assert.equal(update.status, 200);
  const updated = await update.json();
  assert.equal(updated.item.label, "Updated Season");
  assert.equal(updated.item.year, 2028);
  assert.equal(updated.item.starts_on, "2026-02-01");

  const invalid = await patchSeason(ORG_1, adminUser, seasonId, {
    ends_on: "2025-01-01",
  });
  assert.equal(invalid.status, 400);
  const invalidBody = await invalid.json();
  assert.equal(invalidBody.message, "ends_on must be on or after starts_on");
});

test("org scoping enforced", async () => {
  const res = await createSeason(ORG_1, adminUser);
  assert.equal(res.status, 201);
  const seasonId = (await res.json()).item.id;

  const getDifferentOrg = await getSeason(ORG_2, adminOrg2, seasonId);
  assert.equal(getDifferentOrg.status, 404);
});
