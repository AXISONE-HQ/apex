import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const TEAM_1_ORG1 = "00000000-0000-0000-0000-000000000101";
const TEAM_1_ORG2 = "00000000-0000-0000-0000-000000000201";

let teamOrg1Id = TEAM_1_ORG1;
let teamOrg2Id = TEAM_1_ORG2;

const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000003001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000003002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009997";

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
    [ORG_1, "Status Org One", "status-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Status Org Two", "status-org-two"]
  );

  await query(
    `INSERT INTO teams (id, org_id, name, season_year)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [TEAM_1_ORG1, ORG_1, "Status Org1 Team", 2026]
  );

  await query(
    `INSERT INTO teams (id, org_id, name, season_year)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [TEAM_1_ORG2, ORG_2, "Status Org2 Team", 2026]
  );
}

async function createTeamForOrg(orgId, name) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams`, {
    method: "POST",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({
      name,
      season_year: 2026,
      season_label: "2026 Outdoor",
      sport: "soccer",
      team_level: "club",
      competition_level: "club",
      age_category: "U18",
    }),
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create team for org ${orgId}: ${res.status}`);
  }
  const json = await res.json();
  return json.item.id;
}

async function createPlayer({ orgId = ORG_1, headers = headersForOrgAdmin(orgId), body }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function activatePlayer({ orgId = ORG_1, playerId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/activate`, {
    method: "POST",
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function deactivatePlayer({ orgId = ORG_1, playerId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/deactivate`, {
    method: "POST",
    headers,
  });
  return { status: res.status, body: await res.json() };
}

function assertStatus(player, expected) {
  assert.equal(player.status, expected);
  assert.ok(player.updated_at);
}

test.before(async () => {
  if (process.env.DATABASE_URL) await seedDb();

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  if (!process.env.DATABASE_URL) {
    teamOrg1Id = await createTeamForOrg(ORG_1, "Status Org1 Default");
    teamOrg2Id = await createTeamForOrg(ORG_2, "Status Org2 Default");
  } else {
    teamOrg1Id = TEAM_1_ORG1;
    teamOrg2Id = TEAM_1_ORG2;
  }
});

test.after(async () => {
  if (server?.close) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// DEACTIVATE TESTS

test("Deactivate: PlatformAdmin can deactivate active player", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Plat", last_name: "Deact", status: "active" },
  });

  const { status, body } = await deactivatePlayer({
    orgId: ORG_1,
    playerId: created.item.id,
    headers: platformHeaders,
  });

  assert.equal(status, 200);
  assertStatus(body.player, "inactive");
});

test("Deactivate: OrgAdmin scoped to org can deactivate", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Org", last_name: "Deact" },
  });

  const { status, body } = await deactivatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(status, 200);
  assertStatus(body.player, "inactive");
});

test("Deactivate: wrong-org OrgAdmin gets forbidden", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Wrong", last_name: "Org" },
  });

  const { status, body } = await deactivatePlayer({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: headersForOrgAdmin(ORG_1, USER_ORGADMIN_2),
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Deactivate: missing player returns player_not_found", async () => {
  const { status, body } = await deactivatePlayer({
    orgId: ORG_1,
    playerId: "00000000-0000-0000-0000-00000000abcd",
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Deactivate: already inactive is idempotent", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Idle", last_name: "Inactive", status: "inactive" },
  });

  const first = await deactivatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(first.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 2));

  const second = await deactivatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(second.status, 200);
  assert.equal(second.body.player.updated_at, first.body.player.updated_at);
});

test("Deactivate: does not clear team_id", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Team", last_name: "Member", team_id: teamOrg1Id },
  });

  const { status, body } = await deactivatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(status, 200);
  assert.equal(body.player.team_id, teamOrg1Id);
  assert.equal(body.player.status, "inactive");
});

// ACTIVATE TESTS

test("Activate: PlatformAdmin can activate inactive player", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Plat", last_name: "Activate", status: "inactive" },
  });

  const { status, body } = await activatePlayer({
    orgId: ORG_1,
    playerId: created.item.id,
    headers: platformHeaders,
  });

  assert.equal(status, 200);
  assertStatus(body.player, "active");
});

test("Activate: OrgAdmin scoped to org can activate", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Org", last_name: "Activate", status: "inactive" },
  });

  const { status, body } = await activatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(status, 200);
  assertStatus(body.player, "active");
});

test("Activate: wrong-org OrgAdmin gets forbidden", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Wrong", last_name: "Activate", status: "inactive" },
  });

  const { status, body } = await activatePlayer({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: headersForOrgAdmin(ORG_1, USER_ORGADMIN_2),
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Activate: missing player returns player_not_found", async () => {
  const { status, body } = await activatePlayer({
    orgId: ORG_1,
    playerId: "00000000-0000-0000-0000-00000000abcd",
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Activate: already active is idempotent", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Idle", last_name: "Active", status: "active" },
  });

  const first = await activatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(first.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 2));

  const second = await activatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(second.status, 200);
  assert.equal(second.body.player.updated_at, first.body.player.updated_at);
});

test("Activate: does not change team_id", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Team", last_name: "Active", team_id: teamOrg1Id, status: "inactive" },
  });

  const { status, body } = await activatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(status, 200);
  assert.equal(body.player.team_id, teamOrg1Id);
  assert.equal(body.player.status, "active");
});

// LIFECYCLE INTEGRITY

test("Lifecycle: deactivate then activate restores status", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Life", last_name: "Cycle" },
  });

  const deactivated = await deactivatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.player.status, "inactive");

  await new Promise((resolve) => setTimeout(resolve, 2));

  const activated = await activatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(activated.status, 200);
  assert.equal(activated.body.player.status, "active");
});

test("Lifecycle: status endpoints do not touch other fields", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: {
      first_name: "Field",
      last_name: "Guard",
      display_name: "FG",
      jersey_number: 12,
      birth_year: 2010,
      position: "PG",
      notes: "Status test",
      status: "inactive",
    },
  });

  const activated = await activatePlayer({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(activated.status, 200);
  const player = activated.body.player;
  assert.equal(player.first_name, "Field");
  assert.equal(player.last_name, "Guard");
  assert.equal(player.display_name, "FG");
  assert.equal(player.jersey_number, 12);
  assert.equal(player.birth_year, 2010);
  assert.equal(player.position, "PG");
  assert.equal(player.notes, "Status test");
});
