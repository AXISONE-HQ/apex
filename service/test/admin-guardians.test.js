import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000101";
const ORG_2 = "00000000-0000-0000-0000-000000000202";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000004001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000004002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009996";

function uniqueValue(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function xUser({ id, roles = [], orgScopes = [], isPlatformAdmin = false }) {
  return {
    id,
    roles,
    orgScopes,
    isPlatformAdmin,
  };
}

function headersForOrgAdmin(orgId, userId = USER_ORGADMIN_1) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({ id: userId, roles: ["OrgAdmin"], orgScopes: [orgId] })
    ),
  };
}

const platformHeaders = {
  "content-type": "application/json",
  "x-user": JSON.stringify(xUser({ id: USER_PLATFORM, isPlatformAdmin: true })),
};

async function seedDb() {
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Guardian Org One", "guardian-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Guardian Org Two", "guardian-org-two"]
  );
}

async function createGuardian({ orgId = ORG_1, headers = headersForOrgAdmin(orgId), body }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function listGuardians({ orgId = ORG_1, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians`, {
    method: "GET",
    headers,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function patchGuardian({ orgId = ORG_1, guardianId, headers = headersForOrgAdmin(orgId), body }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians/${guardianId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

test.before(async () => {
  if (process.env.DATABASE_URL) await seedDb();

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server?.close) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// CREATE TESTS

test("Create guardian: PlatformAdmin success", async () => {
  const { status, body } = await createGuardian({
    orgId: ORG_1,
    headers: platformHeaders,
    body: { first_name: "Plat", last_name: "Guardian" },
  });

  assert.equal(status, 201);
  assert.equal(body.guardian.first_name, "Plat");
});

test("Create guardian: OrgAdmin success", async () => {
  const { status, body } = await createGuardian({
    orgId: ORG_1,
    body: { first_name: "Org", last_name: "Guardian" },
  });

  assert.equal(status, 201);
  assert.equal(body.guardian.org_id, ORG_1);
});

test("Create guardian: OrgAdmin without scope is forbidden", async () => {
  const { status, body } = await createGuardian({
    orgId: ORG_2,
    headers: headersForOrgAdmin(ORG_1, USER_ORGADMIN_2),
    body: { first_name: "Wrong", last_name: "Org" },
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

// LIST TESTS

test("List guardians: returns org-only data ordered by name", async () => {
  const names = [
    { first_name: "Charlie", last_name: "Adams" },
    { first_name: "Alice", last_name: "Zephyr" },
    { first_name: "Betty", last_name: "Adams" },
  ];

  for (const body of names) {
    await createGuardian({ orgId: ORG_1, body });
  }

  const { status, body } = await listGuardians({ orgId: ORG_1 });
  assert.equal(status, 200);
  const resultNames = body.guardians.map((g) => `${g.last_name}-${g.first_name}`);
  const sorted = [...resultNames].sort();
  assert.deepEqual(resultNames, sorted);
});

test("List guardians: org isolation", async () => {
  const uniqueOrg1 = uniqueValue("Org1");
  const uniqueOrg2 = uniqueValue("Org2");

  await createGuardian({ orgId: ORG_1, body: { first_name: "A", last_name: uniqueOrg1 } });
  await createGuardian({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "B", last_name: uniqueOrg2 },
  });

  const { status, body } = await listGuardians({ orgId: ORG_1 });
  assert.equal(status, 200);
  assert.ok(body.guardians.some((g) => g.last_name === uniqueOrg1));
  assert.ok(!body.guardians.some((g) => g.last_name === uniqueOrg2));
});

// PATCH TESTS

test("Patch guardian: success with trimming + email lowercasing", async () => {
  const { body: created } = await createGuardian({
    orgId: ORG_1,
    body: { first_name: "Patch", last_name: "Guardian" },
  });

  const { status, body } = await patchGuardian({
    orgId: ORG_1,
    guardianId: created.guardian.id,
    body: {
      display_name: "  Display  ",
      email: "  USER@Example.COM  ",
      phone: "  555-5555  ",
      relationship: "  Parent  ",
      notes: "  Hello  ",
      status: "inactive",
    },
  });

  assert.equal(status, 200);
  const g = body.guardian;
  assert.equal(g.display_name, "Display");
  assert.equal(g.email, "user@example.com");
  assert.equal(g.phone, "555-5555");
  assert.equal(g.relationship, "Parent");
  assert.equal(g.notes, "Hello");
  assert.equal(g.status, "inactive");
});

test("Patch guardian: empty body rejected", async () => {
  const { body: created } = await createGuardian({
    orgId: ORG_1,
    body: { first_name: "Empty", last_name: "Body" },
  });

  const { status, body } = await patchGuardian({
    orgId: ORG_1,
    guardianId: created.guardian.id,
    body: {},
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

test("Patch guardian: unknown field rejected", async () => {
  const { body: created } = await createGuardian({
    orgId: ORG_1,
    body: { first_name: "Unknown", last_name: "Field" },
  });

  const { status, body } = await patchGuardian({
    orgId: ORG_1,
    guardianId: created.guardian.id,
    body: { foo: "bar" },
  });

  assert.equal(status, 400);
  assert.equal(body.message, "unknown field: foo");
});

test("Patch guardian: missing guardian returns 404", async () => {
  const { status, body } = await patchGuardian({
    orgId: ORG_1,
    guardianId: "00000000-0000-0000-0000-00000000abcd",
    body: { notes: "hi" },
  });

  assert.equal(status, 404);
  assert.equal(body.error, "guardian_not_found");
});

test("Patch guardian: optional strings trimmed to null", async () => {
  const { body: created } = await createGuardian({
    orgId: ORG_1,
    body: { first_name: "Null", last_name: "Fields", display_name: "Value" },
  });

  const { status, body } = await patchGuardian({
    orgId: ORG_1,
    guardianId: created.guardian.id,
    body: {
      display_name: "   ",
      email: "   ",
      phone: "\t",
      relationship: "",
      notes: "  ",
    },
  });

  assert.equal(status, 200);
  const g = body.guardian;
  assert.equal(g.display_name, null);
  assert.equal(g.email, null);
  assert.equal(g.phone, null);
  assert.equal(g.relationship, null);
  assert.equal(g.notes, null);
});

// VALIDATION TESTS

test("Create guardian: invalid status rejected", async () => {
  const { status, body } = await createGuardian({
    orgId: ORG_1,
    body: { first_name: "Invalid", last_name: "Status", status: "pending" },
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

test("Patch guardian: invalid status rejected", async () => {
  const { body: created } = await createGuardian({
    orgId: ORG_1,
    body: { first_name: "Patch", last_name: "Status" },
  });

  const { status, body } = await patchGuardian({
    orgId: ORG_1,
    guardianId: created.guardian.id,
    body: { status: "pending" },
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});
