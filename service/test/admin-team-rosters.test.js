import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const TEAM_1_ORG1 = "00000000-0000-0000-0000-000000000111";
const TEAM_1_ORG2 = "00000000-0000-0000-0000-000000000211";

let teamOrg1Id = TEAM_1_ORG1;
let teamOrg2Id = TEAM_1_ORG2;

const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000002001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000002002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009998";

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
     ON CONFLICT (id) DO NOTHING`,
    [ORG_1, "Roster Org One", "roster-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [ORG_2, "Roster Org Two", "roster-org-two"]
  );

  await query(
    `INSERT INTO teams (id, org_id, name, season_year)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [TEAM_1_ORG1, ORG_1, "Roster Org1 Team", 2026]
  );

  await query(
    `INSERT INTO teams (id, org_id, name, season_year)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [TEAM_1_ORG2, ORG_2, "Roster Org2 Team", 2026]
  );
}

async function createTeamForOrg(orgId, name) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams`, {
    method: "POST",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({
      name,
      season_year: 2026,
    }),
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create team for org ${orgId}: ${res.status}`);
  }
  const json = await res.json();
  return json.item.id;
}

async function archiveTeam(orgId, teamId) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams/${teamId}`, {
    method: "PATCH",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({ is_archived: true }),
  });
  if (res.status !== 200) {
    throw new Error(`Failed to archive team ${teamId}: ${res.status}`);
  }
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

async function assignPlayerToTeam({ orgId = ORG_1, playerId, teamId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/team`, {
    method: "POST",
    headers,
    body: JSON.stringify({ team_id: teamId }),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function fetchTeamRoster({ orgId, teamId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams/${teamId}/players`, {
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function fetchUnassigned({ orgId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/unassigned`, {
    headers,
  });
  return { status: res.status, body: await res.json() };
}

function playerNames(players) {
  return players.map((p) => `${p.last_name}-${p.first_name}`);
}

test.before(async () => {
  if (process.env.DATABASE_URL) await seedDb();

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  if (!process.env.DATABASE_URL) {
    teamOrg1Id = await createTeamForOrg(ORG_1, "Roster Org1 Default");
    teamOrg2Id = await createTeamForOrg(ORG_2, "Roster Org2 Default");
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

// TEAM ROSTER TESTS

test("Team roster: PlatformAdmin sees roster with stable ordering", async () => {
  const uniqueTeam = await createTeamForOrg(ORG_1, uniqueValue("Roster Team"));
  const players = [
    { first_name: "Amy", last_name: "Zeppelin" },
    { first_name: "Bea", last_name: "Adams" },
    { first_name: "Cara", last_name: "Adams" },
  ];

  for (const body of players) {
    const { body: created } = await createPlayer({ orgId: ORG_1, body });
    await assignPlayerToTeam({ orgId: ORG_1, playerId: created.item.id, teamId: uniqueTeam });
  }

  const { status, body } = await fetchTeamRoster({
    orgId: ORG_1,
    teamId: uniqueTeam,
    headers: platformHeaders,
  });

  assert.equal(status, 200);
  const names = playerNames(body.players);
  assert.deepEqual(names, [...names].sort());
});

test("Team roster: OrgAdmin scoped to org can read roster", async () => {
  const teamId = await createTeamForOrg(ORG_1, uniqueValue("Roster Team"));
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Roster", last_name: "OrgAdmin" },
  });
  await assignPlayerToTeam({ orgId: ORG_1, playerId: created.item.id, teamId });

  const { status, body } = await fetchTeamRoster({ orgId: ORG_1, teamId });
  assert.equal(status, 200);
  const target = body.players.find((p) => p.id === created.item.id);
  assert.ok(target);
});

test("Team roster: OrgAdmin without org scope is forbidden", async () => {
  const { status, body } = await fetchTeamRoster({
    orgId: ORG_1,
    teamId: teamOrg1Id,
    headers: headersForOrgAdmin(ORG_2, USER_ORGADMIN_2),
  });
  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Team roster: missing team returns team_not_found", async () => {
  const { status, body } = await fetchTeamRoster({
    orgId: ORG_1,
    teamId: "00000000-0000-0000-0000-00000000abcd",
  });
  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

test("Team roster: cross-org team returns team_not_found", async () => {
  const { status, body } = await fetchTeamRoster({
    orgId: ORG_1,
    teamId: teamOrg2Id,
  });
  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

test("Team roster: archived team returns team_not_found", async () => {
  const archivedTeam = await createTeamForOrg(ORG_1, uniqueValue("Archived"));
  await archiveTeam(ORG_1, archivedTeam);

  const { status, body } = await fetchTeamRoster({ orgId: ORG_1, teamId: archivedTeam });
  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

test("Team roster: valid active team with no players returns empty array", async () => {
  const emptyTeam = await createTeamForOrg(ORG_1, uniqueValue("Empty"));
  const { status, body } = await fetchTeamRoster({ orgId: ORG_1, teamId: emptyTeam });
  assert.equal(status, 200);
  assert.deepEqual(body.players, []);
});

test("Team roster: response excludes players from other teams and unassigned", async () => {
  const primaryTeam = await createTeamForOrg(ORG_1, uniqueValue("Primary"));
  const otherTeam = await createTeamForOrg(ORG_1, uniqueValue("Secondary"));

  const { body: onTeam } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Roster", last_name: "Member" },
  });
  await assignPlayerToTeam({ orgId: ORG_1, playerId: onTeam.item.id, teamId: primaryTeam });

  const { body: otherTeamPlayer } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Other", last_name: "Team" },
  });
  await assignPlayerToTeam({ orgId: ORG_1, playerId: otherTeamPlayer.item.id, teamId: otherTeam });

  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Solo", last_name: "Unassigned" },
  });

  const { status, body } = await fetchTeamRoster({ orgId: ORG_1, teamId: primaryTeam });
  assert.equal(status, 200);
  assert.ok(body.players.find((p) => p.id === onTeam.item.id));
  assert.ok(!body.players.find((p) => p.id === otherTeamPlayer.item.id));
  assert.ok(!body.players.find((p) => p.last_name === "Unassigned"));
});

// UNASSIGNED ROSTER TESTS

test("Unassigned players: PlatformAdmin sees only team_id NULL", async () => {
  const { body: assigned } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assigned", last_name: uniqueValue("Player") },
  });
  await assignPlayerToTeam({ orgId: ORG_1, playerId: assigned.item.id, teamId: teamOrg1Id });

  const unassignedLastName = uniqueValue("Unassigned");
  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Solo", last_name: unassignedLastName },
  });

  const { status, body } = await fetchUnassigned({ orgId: ORG_1, headers: platformHeaders });
  assert.equal(status, 200);
  const matches = body.players.filter((p) => p.last_name === unassignedLastName);
  assert.ok(matches.length === 1);
  assert.ok(matches.every((p) => p.team_id === null));
});

test("Unassigned players: OrgAdmin scoped to org can read list", async () => {
  const uniqueLast = uniqueValue("ScopedUnassigned");
  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Scoped", last_name: uniqueLast },
  });

  const { status, body } = await fetchUnassigned({ orgId: ORG_1 });
  assert.equal(status, 200);
  assert.ok(body.players.some((p) => p.last_name === uniqueLast));
});

test("Unassigned players: OrgAdmin without org scope is forbidden", async () => {
  const { status, body } = await fetchUnassigned({
    orgId: ORG_1,
    headers: headersForOrgAdmin(ORG_2, USER_ORGADMIN_2),
  });
  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Unassigned players: excludes assigned players and other orgs", async () => {
  const { body: org1Player } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Org1", last_name: uniqueValue("UnassignedFilter") },
  });
  const { body: org2Player } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Org2", last_name: uniqueValue("UnassignedFilter") },
  });
  await assignPlayerToTeam({ orgId: ORG_2, playerId: org2Player.item.id, teamId: teamOrg2Id, headers: platformHeaders });

  const { status, body } = await fetchUnassigned({ orgId: ORG_1 });
  assert.equal(status, 200);
  assert.ok(body.players.some((p) => p.id === org1Player.item.id));
  assert.ok(!body.players.some((p) => p.id === org2Player.item.id));
});

test("Unassigned players: empty list returns 200", async () => {
  const initial = await fetchUnassigned({ orgId: ORG_2, headers: platformHeaders });
  for (const player of initial.body.players || []) {
    await assignPlayerToTeam({
      orgId: ORG_2,
      playerId: player.id,
      teamId: teamOrg2Id,
      headers: platformHeaders,
    });
  }

  const { status, body } = await fetchUnassigned({ orgId: ORG_2, headers: platformHeaders });
  assert.equal(status, 200);
  assert.deepEqual(body.players, []);
});
