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

const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000001001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000001002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009999";

function uniqueName(prefix) {
  return `${prefix} ${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function xUser({ id, roles = [], orgScopes = [], teamScopes = [], isPlatformAdmin = false }) {
  return {
    id,
    roles,
    orgScopes,
    teamScopes,
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
    [ORG_1, "Org One", "org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Org Two", "org-two"]
  );

  await query(
    `INSERT INTO teams (id, org_id, name, season_year)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [TEAM_1_ORG1, ORG_1, "Team One", 2026]
  );

  await query(
    `INSERT INTO teams (id, org_id, name, season_year)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [TEAM_1_ORG2, ORG_2, "Team Two", 2026]
  );
}

test.before(async () => {
  if (process.env.DATABASE_URL) await seedDb();

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  if (!process.env.DATABASE_URL) {
    teamOrg1Id = await createTeamForOrg(ORG_1, "Org1 Team");
    teamOrg2Id = await createTeamForOrg(ORG_2, "Org2 Team");
  } else {
    teamOrg1Id = TEAM_1_ORG1;
    teamOrg2Id = TEAM_1_ORG2;
  }
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

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

async function listPlayers(orgId = ORG_1, headers = headersForOrgAdmin(orgId), query = "") {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players${query}`, {
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function patchPlayer({ orgId = ORG_1, playerId, headers = headersForOrgAdmin(orgId), body }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function assignTeam({ orgId = ORG_1, playerId, headers = headersForOrgAdmin(orgId), teamId }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/team`, {
    method: "POST",
    headers,
    body: JSON.stringify({ team_id: teamId }),
  });
  return { status: res.status, body: await res.json() };
}

async function unassignTeam({ orgId = ORG_1, playerId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/team`, {
    method: "DELETE",
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function archiveTeam(orgId, teamId) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams/${teamId}`, {
    method: "PATCH",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({ is_archived: true }),
  });
  if (res.status !== 200) {
    throw new Error(`Failed to archive team ${teamId} in org ${orgId}: ${res.status}`);
  }
  return res.json();
}

function assertPlayerFields(player) {
  assert.ok(player.id);
  assert.equal(player.org_id, ORG_1);
  assert.ok(player.created_at);
  assert.ok(player.updated_at);
}

// Smoke test ensures server is up
test("Smoke: GET /healthz", async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.equal(res.status, 200);
});

// CREATE

test("OrgAdmin can create player in own org", async () => {
  const { status, body } = await createPlayer({
    orgId: ORG_1,
    body: {
      first_name: "Mackenzie",
      last_name: "Binette",
      jersey_number: 12,
      birth_year: 2012,
      position: "PG",
      notes: "Left-handed",
      status: "active",
    },
  });

  assert.equal(status, 201);
  assertPlayerFields(body.item);
  assert.equal(body.item.first_name, "Mackenzie");
});

test("OrgAdmin cannot create player in another org", async () => {
  const { status, body } = await createPlayer({
    orgId: ORG_2,
    headers: headersForOrgAdmin(ORG_1),
    body: {
      first_name: "Taylor",
      last_name: "Smith",
    },
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Platform admin can create player in any org", async () => {
  const { status, body } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: {
      first_name: "Jordan",
      last_name: "Lee",
      team_id: teamOrg2Id,
    },
  });

  assert.equal(status, 201);
  assert.equal(body.item.team_id, teamOrg2Id);
});

test("Create rejects unknown field", async () => {
  const { status, body } = await createPlayer({
    orgId: ORG_1,
    body: {
      first_name: "Sam",
      last_name: "Doe",
      evil: true,
    },
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

test("Create rejects invalid team assignment", async () => {
  const { status, body } = await createPlayer({
    orgId: ORG_1,
    body: {
      first_name: "Alex",
      last_name: "Cross",
      team_id: teamOrg2Id,
    },
  });

  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

// LIST

test("GET players returns org-only players ordered by last, first, created", async () => {
  // Seed players
  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Carson", last_name: "Adams" },
  });
  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Blake", last_name: "Adams" },
  });

  const { status, body } = await listPlayers(ORG_1);
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.items));
  const names = body.items.map((p) => `${p.last_name}-${p.first_name}`);
  const sorted = [...names].sort();
  assert.deepEqual(names, sorted);
});

test("GET players rejects OrgAdmin without org scope", async () => {
  const { status, body } = await listPlayers(ORG_2, headersForOrgAdmin(ORG_1));
  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("GET players returns data scoped to the requested org", async () => {
  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Org", last_name: "One" },
  });
  await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Org", last_name: "Two" },
  });

  const { status, body } = await listPlayers(ORG_1);
  assert.equal(status, 200);
  assert.ok(body.items.length > 0);
  assert.ok(body.items.every((p) => p.org_id === ORG_1));
});

test("GET players filters by status", async () => {
  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Status", last_name: "Active", status: "active" },
  });
  await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Status", last_name: "Inactive", status: "inactive" },
  });

  const { status, body } = await listPlayers(
    ORG_1,
    headersForOrgAdmin(ORG_1),
    `?status=inactive`
  );
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.length > 0);
  assert.ok(body.items.every((p) => p.status === "inactive"));
});

// PATCH

test("OrgAdmin can patch player fields", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Jamie", last_name: "Cole" },
  });

  const { status, body } = await patchPlayer({
    orgId: ORG_1,
    playerId: created.item.id,
    body: {
      notes: "Updated",
      position: "SG",
      status: "inactive",
    },
  });

  assert.equal(status, 200);
  assert.equal(body.item.status, "inactive");
  assert.equal(body.item.position, "SG");
});

test("PATCH rejects empty body", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Morgan", last_name: "Quill" },
  });

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/players/${created.item.id}`, {
    method: "PATCH",
    headers: headersForOrgAdmin(ORG_1),
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "bad_request");
});

test("PATCH team assignment enforces same org", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Reese", last_name: "Hayes" },
  });

  const { status, body } = await patchPlayer({
    orgId: ORG_1,
    playerId: created.item.id,
    body: { team_id: teamOrg2Id },
  });

  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

test("PATCH team assignment succeeds when team is in org", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Kris", last_name: "Rollins" },
  });

  const { status, body } = await patchPlayer({
    orgId: ORG_1,
    playerId: created.item.id,
    body: { team_id: teamOrg1Id },
  });

  assert.equal(status, 200);
  assert.equal(body.item.team_id, teamOrg1Id);
});

test("PATCH unassigns team when team_id is null", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Lena", last_name: "Khan", team_id: teamOrg1Id },
  });

  const { status, body } = await patchPlayer({
    orgId: ORG_1,
    playerId: created.item.id,
    body: { team_id: null },
  });

  assert.equal(status, 200);
  assert.equal(body.item.team_id, null);
});

test("PATCH trims optional string fields down to null", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: {
      first_name: "Taylor",
      last_name: "Nulls",
      display_name: "Nickname",
      notes: "Has notes",
      jersey_number: 15,
      position: "Wing",
    },
  });

  const { status, body } = await patchPlayer({
    orgId: ORG_1,
    playerId: created.item.id,
    body: {
      display_name: "   ",
      notes: "  ",
      position: "\t",
      jersey_number: null,
    },
  });

  assert.equal(status, 200);
  assert.equal(body.item.display_name, null);
  assert.equal(body.item.notes, null);
  assert.equal(body.item.jersey_number, null);
  assert.equal(body.item.position, null);
});

test("PATCH returns player_not_found for missing player", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/players/00000000-0000-0000-0000-00000000ffff`, {
    method: "PATCH",
    headers: headersForOrgAdmin(ORG_1),
    body: JSON.stringify({ position: "C" }),
  });

  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, "player_not_found");
});

// ASSIGN TEAM ENDPOINTS

test("Assign team: OrgAdmin can assign player to team in own org", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "OrgAdmin" },
  });

  const { status, body } = await assignTeam({
    orgId: ORG_1,
    playerId: created.item.id,
    teamId: teamOrg1Id,
  });

  assert.equal(status, 200);
  assert.equal(body.player.team_id, teamOrg1Id);
});

test("Assign team: Platform admin can assign player in any org", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Assign", last_name: "Platform" },
  });

  const { status, body } = await assignTeam({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: platformHeaders,
    teamId: teamOrg2Id,
  });

  assert.equal(status, 200);
  assert.equal(body.player.team_id, teamOrg2Id);
});

test("Assign team: OrgAdmin without org scope is forbidden", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Assign", last_name: "Forbidden" },
  });

  const { status, body } = await assignTeam({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: headersForOrgAdmin(ORG_1),
    teamId: teamOrg2Id,
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Assign team: cross-org or invalid team returns team_not_found", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "Invalid" },
  });

  const { status, body } = await assignTeam({
    orgId: ORG_1,
    playerId: created.item.id,
    teamId: teamOrg2Id,
  });

  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

test("Assign team: archived team is treated as not found", async () => {
  const newTeamId = await createTeamForOrg(ORG_1, uniqueName("Archived Team"));
  await archiveTeam(ORG_1, newTeamId);

  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "Archived" },
  });

  const { status, body } = await assignTeam({
    orgId: ORG_1,
    playerId: created.item.id,
    teamId: newTeamId,
  });

  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

test("Assign team: missing player returns player_not_found", async () => {
  const { status, body } = await assignTeam({
    orgId: ORG_1,
    playerId: "00000000-0000-0000-0000-00000000ffff",
    teamId: teamOrg1Id,
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Assign team: assigning same team twice is idempotent", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "Idempotent" },
  });

  const first = await assignTeam({
    orgId: ORG_1,
    playerId: created.item.id,
    teamId: teamOrg1Id,
  });

  assert.equal(first.status, 200);
  assert.equal(first.body.player.team_id, teamOrg1Id);

  const second = await assignTeam({
    orgId: ORG_1,
    playerId: created.item.id,
    teamId: teamOrg1Id,
  });

  assert.equal(second.status, 200);
  assert.equal(second.body.player.team_id, teamOrg1Id);
  assert.equal(second.body.player.updated_at, first.body.player.updated_at);
});

test("Assign team: assigning a new team overwrites previous assignment", async () => {
  const anotherTeamId = await createTeamForOrg(ORG_1, uniqueName("Org1 Secondary Team"));
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "Overwrite" },
  });

  const first = await assignTeam({
    orgId: ORG_1,
    playerId: created.item.id,
    teamId: teamOrg1Id,
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.player.team_id, teamOrg1Id);

  await new Promise((resolve) => setTimeout(resolve, 2));

  const second = await assignTeam({
    orgId: ORG_1,
    playerId: created.item.id,
    teamId: anotherTeamId,
  });

  assert.equal(second.status, 200);
  assert.equal(second.body.player.team_id, anotherTeamId);
  assert.notEqual(second.body.player.updated_at, first.body.player.updated_at);
});

// UNASSIGN TEAM ENDPOINTS

test("Unassign team: OrgAdmin can remove team assignment", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "Remove" },
  });

  await assignTeam({ orgId: ORG_1, playerId: created.item.id, teamId: teamOrg1Id });

  const { status, body } = await unassignTeam({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(status, 200);
  assert.equal(body.player.team_id, null);
});

test("Unassign team: Platform admin can remove team assignment", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Assign", last_name: "RemovePlatform" },
  });

  await assignTeam({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: platformHeaders,
    teamId: teamOrg2Id,
  });

  const { status, body } = await unassignTeam({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: platformHeaders,
  });

  assert.equal(status, 200);
  assert.equal(body.player.team_id, null);
});

test("Unassign team: OrgAdmin without org scope is forbidden", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_2,
    headers: platformHeaders,
    body: { first_name: "Assign", last_name: "UnassignForbidden" },
  });

  await assignTeam({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: platformHeaders,
    teamId: teamOrg2Id,
  });

  const { status, body } = await unassignTeam({
    orgId: ORG_2,
    playerId: created.item.id,
    headers: headersForOrgAdmin(ORG_1),
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Unassign team: missing player returns player_not_found", async () => {
  const { status, body } = await unassignTeam({
    orgId: ORG_1,
    playerId: "00000000-0000-0000-0000-00000000ffff",
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Unassign team: removing when already unassigned is idempotent", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "UnassignIdle" },
  });

  const first = await unassignTeam({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(first.status, 200);
  assert.equal(first.body.player.team_id, null);

  const second = await unassignTeam({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(second.status, 200);
  assert.equal(second.body.player.team_id, null);
  assert.equal(second.body.player.updated_at, first.body.player.updated_at);
});

test("Unassign team: removing assignment updates updated_at and clears team_id", async () => {
  const { body: created } = await createPlayer({
    orgId: ORG_1,
    body: { first_name: "Assign", last_name: "UnassignUpdates" },
  });

  const assigned = await assignTeam({ orgId: ORG_1, playerId: created.item.id, teamId: teamOrg1Id });
  assert.equal(assigned.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 2));

  const removed = await unassignTeam({ orgId: ORG_1, playerId: created.item.id });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.player.team_id, null);
  assert.notEqual(removed.body.player.updated_at, assigned.body.player.updated_at);
});


test("Coach with team scope can view player detail", async () => {
  const playerRes = await createPlayer({
    orgId: ORG_1,
    body: {
      first_name: "Roster",
      last_name: "Target",
      team_id: teamOrg1Id,
      jersey_number: 12,
      birth_year: 2010,
      position: "G",
      status: "active",
    },
  });
  assert.equal(playerRes.status, 201, `player create failed: ${playerRes.status}`);
  const playerId = playerRes.body.item.id;

  const coachHeaders = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: "coach-user",
        roles: ["Coach"],
        orgScopes: [ORG_1],
        teamScopes: [teamOrg1Id],
      })
    ),
  };

  const detailRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/players/${playerId}`, {
    method: "GET",
    headers: coachHeaders,
  });
  assert.equal(detailRes.status, 200);
  const detailBody = await detailRes.json();
  assert.ok(detailBody.player);
  assert.equal(detailBody.player.id, playerId);
  assert.ok(detailBody.team);
  assert.equal(detailBody.team.id, teamOrg1Id);
});

test("Coach without team scope cannot view player detail", async () => {
  const playerRes = await createPlayer({
    orgId: ORG_1,
    body: {
      first_name: "Blocked",
      last_name: "Player",
      team_id: teamOrg1Id,
      status: "active",
    },
  });
  assert.equal(playerRes.status, 201, `player create failed: ${playerRes.status}`);
  const playerId = playerRes.body.item.id;

  const coachHeaders = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({
        id: "coach-noscope",
        roles: ["Coach"],
        orgScopes: [ORG_1],
        teamScopes: [],
      })
    ),
  };

  const detailRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/players/${playerId}`, {
    method: "GET",
    headers: coachHeaders,
  });
  assert.equal(detailRes.status, 403);
  const body = await detailRes.json();
  assert.equal(body.error, "forbidden");
});
