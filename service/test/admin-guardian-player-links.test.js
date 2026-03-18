import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000a01";
const ORG_2 = "00000000-0000-0000-0000-000000000a02";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000005001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000005002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009995";

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
    [ORG_1, "Link Org One", "link-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Link Org Two", "link-org-two"]
  );
}

async function createGuardian(orgId, lastName = "Guardian") {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians`, {
    method: "POST",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({ first_name: "Test", last_name: `${lastName}` }),
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create guardian in org ${orgId}: ${res.status}`);
  }
  return (await res.json()).guardian;
}

async function createPlayer(orgId, lastName = "Player") {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({ first_name: "Test", last_name: `${lastName}` }),
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create player in org ${orgId}: ${res.status}`);
  }
  return (await res.json()).item;
}

async function linkGuardian(orgId, playerId, guardianId, headers = headersForOrgAdmin(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/guardians`, {
    method: "POST",
    headers,
    body: JSON.stringify({ guardian_id: guardianId }),
  });
  return { status: res.status, body: await res.json() };
}

async function unlinkGuardian(orgId, playerId, guardianId, headers = headersForOrgAdmin(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/guardians/${guardianId}`, {
    method: "DELETE",
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function listGuardiansForPlayer(orgId, playerId, headers = headersForOrgAdmin(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/guardians`, {
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function listPlayersForGuardian(orgId, guardianId, headers = headersForOrgAdmin(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians/${guardianId}/players`, {
    headers,
  });
  return { status: res.status, body: await res.json() };
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

// LINK TESTS

test("Link: PlatformAdmin can link guardian to player", async () => {
  const guardian = await createGuardian(ORG_1, "PlatLink");
  const player = await createPlayer(ORG_1, "PlatLinkPlayer");

  const { status, body } = await linkGuardian(ORG_1, player.id, guardian.id, platformHeaders);
  assert.equal(status, 200);
  assert.ok(body.ok);
});

test("Link: OrgAdmin scoped to org can link", async () => {
  const guardian = await createGuardian(ORG_1, "OrgLink");
  const player = await createPlayer(ORG_1, "OrgLinkPlayer");

  const { status } = await linkGuardian(ORG_1, player.id, guardian.id);
  assert.equal(status, 200);
});

test("Link: wrong-org OrgAdmin forbidden", async () => {
  const guardian = await createGuardian(ORG_2, "WrongOrg");
  const player = await createPlayer(ORG_2, "WrongOrgPlayer");

  const { status, body } = await linkGuardian(
    ORG_2,
    player.id,
    guardian.id,
    headersForOrgAdmin(ORG_1, USER_ORGADMIN_2)
  );
  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Link: missing player returns player_not_found", async () => {
  const guardian = await createGuardian(ORG_1, "MissingPlayer");

  const { status, body } = await linkGuardian(ORG_1, "00000000-0000-0000-0000-00000000abcd", guardian.id);
  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Link: missing guardian returns guardian_not_found", async () => {
  const player = await createPlayer(ORG_1, "MissingGuardian");

  const { status, body } = await linkGuardian(ORG_1, player.id, "00000000-0000-0000-0000-00000000abcd");
  assert.equal(status, 404);
  assert.equal(body.error, "guardian_not_found");
});

test("Link: cross-org guardian linking rejected", async () => {
  const guardian = await createGuardian(ORG_1, "CrossOrgGuardian");
  const player = await createPlayer(ORG_2, "CrossOrgPlayer");

  const { status, body } = await linkGuardian(ORG_2, player.id, guardian.id, platformHeaders);
  assert.equal(status, 404);
  assert.equal(body.error, "guardian_not_found");
});

test("Link: idempotent linking", async () => {
  const guardian = await createGuardian(ORG_1, "Idempotent");
  const player = await createPlayer(ORG_1, "IdempotentPlayer");

  const first = await linkGuardian(ORG_1, player.id, guardian.id);
  assert.equal(first.status, 200);

  const second = await linkGuardian(ORG_1, player.id, guardian.id);
  assert.equal(second.status, 200);
  assert.ok(second.body.ok);
});

test("Link: unknown fields rejected", async () => {
  const guardian = await createGuardian(ORG_1, "UnknownFieldGuardian");
  const player = await createPlayer(ORG_1, "UnknownFieldPlayer");
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/players/${player.id}/guardians`, {
    method: "POST",
    headers: headersForOrgAdmin(ORG_1),
    body: JSON.stringify({ guardian_id: guardian.id, extra: true }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.message, /unknown field/i);
});

// UNLINK TESTS

test("Unlink: success", async () => {
  const guardian = await createGuardian(ORG_1, "Unlink");
  const player = await createPlayer(ORG_1, "UnlinkPlayer");
  await linkGuardian(ORG_1, player.id, guardian.id);

  const { status, body } = await unlinkGuardian(ORG_1, player.id, guardian.id);
  assert.equal(status, 200);
  assert.ok(body.ok);
});

test("Unlink: idempotent when link absent", async () => {
  const guardian = await createGuardian(ORG_1, "UnlinkNone");
  const player = await createPlayer(ORG_1, "UnlinkNonePlayer");

  const first = await unlinkGuardian(ORG_1, player.id, guardian.id);
  assert.equal(first.status, 200);

  const second = await unlinkGuardian(ORG_1, player.id, guardian.id);
  assert.equal(second.status, 200);
  assert.ok(second.body.ok);
});

test("Unlink: missing player returns player_not_found", async () => {
  const guardian = await createGuardian(ORG_1, "UnlinkMissingPlayer");

  const { status, body } = await unlinkGuardian(ORG_1, "00000000-0000-0000-0000-00000000abcd", guardian.id);
  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Unlink: missing guardian returns guardian_not_found", async () => {
  const player = await createPlayer(ORG_1, "UnlinkMissingGuardian");

  const { status, body } = await unlinkGuardian(ORG_1, player.id, "00000000-0000-0000-0000-00000000abcd");
  assert.equal(status, 404);
  assert.equal(body.error, "guardian_not_found");
});

// LIST GUARDIANS FOR PLAYER

test("List guardians for player: success + ordering", async () => {
  const player = await createPlayer(ORG_1, "ListPlayer");
  const guardians = [
    await createGuardian(ORG_1, "Adams"),
    await createGuardian(ORG_1, "Zephyr"),
    await createGuardian(ORG_1, "AdamsB")
  ];

  for (const g of guardians) {
    await linkGuardian(ORG_1, player.id, g.id);
  }

  const { status, body } = await listGuardiansForPlayer(ORG_1, player.id);
  assert.equal(status, 200);
  const names = body.guardians.map((g) => `${g.last_name}-${g.first_name}`);
  assert.deepEqual(names, [...names].sort());
  body.guardians.forEach((g) => {
    assert.ok(g.linked_at, "linked_at missing on guardian");
  });
});

test("List guardians for player: wrong-org forbidden", async () => {
  const player = await createPlayer(ORG_1, "ListForbidden");

  const { status, body } = await listGuardiansForPlayer(
    ORG_1,
    player.id,
    headersForOrgAdmin(ORG_2, USER_ORGADMIN_2)
  );
  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("List guardians for player: missing player", async () => {
  const { status, body } = await listGuardiansForPlayer(ORG_1, "00000000-0000-0000-0000-00000000abcd");
  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("List guardians for player: empty list returns []", async () => {
  const player = await createPlayer(ORG_1, "EmptyPlayer");
  const { status, body } = await listGuardiansForPlayer(ORG_1, player.id);
  assert.equal(status, 200);
  assert.deepEqual(body.guardians, []);
});

// LIST PLAYERS FOR GUARDIAN

test("List players for guardian: success + ordering", async () => {
  const guardian = await createGuardian(ORG_1, "GuardianListPlayers");
  const players = [
    await createPlayer(ORG_1, "Adams"),
    await createPlayer(ORG_1, "Zephyr"),
    await createPlayer(ORG_1, "AdamsB"),
  ];

  for (const player of players) {
    await linkGuardian(ORG_1, player.id, guardian.id);
  }

  const { status, body } = await listPlayersForGuardian(ORG_1, guardian.id);
  assert.equal(status, 200);
  const names = body.players.map((p) => `${p.last_name}-${p.first_name}`);
  assert.deepEqual(names, [...names].sort());
  body.players.forEach((p) => {
    assert.ok(p.linked_at, "linked_at missing on player");
  });
});

test("List players for guardian: wrong-org forbidden", async () => {
  const guardian = await createGuardian(ORG_1, "GuardianForbidden");
  const { status, body } = await listPlayersForGuardian(
    ORG_1,
    guardian.id,
    headersForOrgAdmin(ORG_2, USER_ORGADMIN_2)
  );
  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("List players for guardian: missing guardian", async () => {
  const { status, body } = await listPlayersForGuardian(ORG_1, "00000000-0000-0000-0000-00000000abcd");
  assert.equal(status, 404);
  assert.equal(body.error, "guardian_not_found");
});

test("List players for guardian: empty list returns []", async () => {
  const guardian = await createGuardian(ORG_1, "GuardianEmpty");
  const { status, body } = await listPlayersForGuardian(ORG_1, guardian.id);
  assert.equal(status, 200);
  assert.deepEqual(body.players, []);
});
