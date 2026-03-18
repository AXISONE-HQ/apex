import test from "node:test";
import assert from "node:assert/strict";
import { uniqueName } from "./helpers/nameUtils.js";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

const ORG_1 = "00000000-0000-0000-0000-000000002201";
const ORG_2 = "00000000-0000-0000-0000-000000002202";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-00000000e001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-00000000e002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009986";

function xUser({ id, roles = [], orgScopes = [], isPlatformAdmin = false }) {
  return { id, roles, orgScopes, isPlatformAdmin };
}

function orgAdminHeaders(orgId, userId = USER_ORGADMIN_1) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(xUser({ id: userId, roles: ["OrgAdmin"], orgScopes: [orgId] })),
  };
}

const platformHeaders = {
  "content-type": "application/json",
  "x-user": JSON.stringify(xUser({ id: USER_PLATFORM, isPlatformAdmin: true })),
};

let server;
let baseUrl;
let playerCounter = 1;
let guardianCounter = 1;

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Guardian Events Org One", "guardian-events-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Guardian Events Org Two", "guardian-events-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_PLATFORM, "platform-admin-7", "platform7@example.com", "Platform Admin 7"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_1, "guardian-events-org-admin-1", "orgadmin1@example.com", "Org Admin One"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_2, "guardian-events-org-admin-2", "orgadmin2@example.com", "Org Admin Two"]
  );
}

async function createTeam(orgId, namePrefix = "Events Team") {
  const payload = {
    name: uniqueName(namePrefix),
    season_year: 2026,
    season_label: "2026 Outdoor",
    sport: "soccer",
    team_level: "club",
    competition_level: "club",
    age_category: "U18",
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create team for org ${orgId}`);
  const body = await res.json();
  return body.item;
}

async function createPlayer(orgId, teamId, firstName = "Player") {
  const payload = {
    first_name: firstName,
    last_name: `#${playerCounter++}`,
  };
  if (teamId) payload.team_id = teamId;
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create player for org ${orgId}`);
  const body = await res.json();
  return body.item;
}

async function setPlayerStatus(orgId, playerId, status) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}`, {
    method: "PATCH",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify({ status }),
  });
  assert.equal(res.status, 200);
}

async function createGuardian(orgId, lastName = "Guardian") {
  const payload = {
    first_name: "Test",
    last_name: lastName,
    email: `guardian-${guardianCounter++}@example.com`,
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201);
  return (await res.json()).guardian;
}

async function createEvent(orgId, teamId, overrides = {}) {
  const payload = {
    team_id: teamId,
    type: overrides.type || "practice",
    title: overrides.title || "Practice",
    starts_at: overrides.starts_at || new Date().toISOString(),
    ends_at: overrides.ends_at || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    location: overrides.location || "Field",
    ...(overrides.type === "game"
      ? {
          opponent_name: overrides.opponent_name || "Opp FC",
          location_type: overrides.location_type || "home",
          game_type: overrides.game_type || "league",
        }
      : {}),
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create event for org ${orgId}`);
  return (await res.json()).event;
}

async function linkGuardian(orgId, playerId, guardianId, headers = orgAdminHeaders(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/guardians`, {
    method: "POST",
    headers,
    body: JSON.stringify({ guardian_id: guardianId }),
  });
  assert.equal(res.status, 200);
}

async function listGuardianEvents(orgId, guardianId, query = "", headers = orgAdminHeaders(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians/${guardianId}/events${query}`, {
    method: "GET",
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
  if (server?.close) await new Promise((resolve) => server.close(resolve));
});

test("Guardian sees events for linked players", async () => {
  const team = await createTeam(ORG_1);
  const guardian = await createGuardian(ORG_1, "FamilyOne");
  const player = await createPlayer(ORG_1, team.id, "Child");
  await linkGuardian(ORG_1, player.id, guardian.id);

  const event1 = await createEvent(ORG_1, team.id, { title: "Morning Practice" });
  const event2 = await createEvent(ORG_1, team.id, { title: "Evening Practice" });

  const { status, body } = await listGuardianEvents(ORG_1, guardian.id);
  assert.equal(status, 200);
  assert.equal(body.events.length, 2);
  const titles = body.events.map((e) => e.title).sort();
  assert.deepEqual(titles, [event1.title, event2.title].sort());
  body.events.forEach((event) => {
    assert.equal(event.players.length, 1);
    assert.equal(event.players[0].id, player.id);
  });
});

test("Multiple linked players on same team appear once per event", async () => {
  const team = await createTeam(ORG_1, "Team Multi");
  const guardian = await createGuardian(ORG_1, "MultiParent");
  const playerA = await createPlayer(ORG_1, team.id, "ChildA");
  const playerB = await createPlayer(ORG_1, team.id, "ChildB");
  await linkGuardian(ORG_1, playerA.id, guardian.id);
  await linkGuardian(ORG_1, playerB.id, guardian.id);

  const event = await createEvent(ORG_1, team.id, { title: "Dual Practice" });

  const { status, body } = await listGuardianEvents(ORG_1, guardian.id);
  assert.equal(status, 200);
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].players.length, 2);
  const playerNames = body.events[0].players.map((p) => p.first_name).sort();
  assert.deepEqual(playerNames, ["ChildA", "ChildB"].sort());
});

test("Guardian linked to players on two teams sees combined schedule", async () => {
  const teamA = await createTeam(ORG_1, "Team A");
  const teamB = await createTeam(ORG_1, "Team B");
  const guardian = await createGuardian(ORG_1, "DualTeam");
  const playerA = await createPlayer(ORG_1, teamA.id, "Alpha");
  const playerB = await createPlayer(ORG_1, teamB.id, "Beta");
  await linkGuardian(ORG_1, playerA.id, guardian.id);
  await linkGuardian(ORG_1, playerB.id, guardian.id);

  const eventA = await createEvent(ORG_1, teamA.id, { title: "Alpha Practice" });
  const eventB = await createEvent(ORG_1, teamB.id, { title: "Beta Practice" });

  const { status, body } = await listGuardianEvents(ORG_1, guardian.id);
  assert.equal(status, 200);
  const titles = body.events.map((e) => e.title).sort();
  assert.deepEqual(titles, [eventA.title, eventB.title].sort());
});

test("Guardian with no linked players gets empty list", async () => {
  const guardian = await createGuardian(ORG_1, "NoLinks");
  const { status, body } = await listGuardianEvents(ORG_1, guardian.id);
  assert.equal(status, 200);
  assert.deepEqual(body.events, []);
});

test("Guardian with unassigned players sees no events", async () => {
  const guardian = await createGuardian(ORG_1, "Unassigned");
  const player = await createPlayer(ORG_1, null, "FreeAgent");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const { status, body } = await listGuardianEvents(ORG_1, guardian.id);
  assert.equal(status, 200);
  assert.deepEqual(body.events, []);
});

test("Inactive linked players are excluded", async () => {
  const team = await createTeam(ORG_1, "Inactive Team");
  const guardian = await createGuardian(ORG_1, "InactiveParent");
  const player = await createPlayer(ORG_1, team.id, "InactiveChild");
  await setPlayerStatus(ORG_1, player.id, "inactive");
  await linkGuardian(ORG_1, player.id, guardian.id);
  await createEvent(ORG_1, team.id, { title: "Invisible Practice" });

  const { status, body } = await listGuardianEvents(ORG_1, guardian.id);
  assert.equal(status, 200);
  assert.deepEqual(body.events, []);
});

test("Filters by from/to", async () => {
  const team = await createTeam(ORG_1, "Filter Team");
  const guardian = await createGuardian(ORG_1, "FilterGuardian");
  const player = await createPlayer(ORG_1, team.id, "FilterChild");
  await linkGuardian(ORG_1, player.id, guardian.id);

  await createEvent(ORG_1, team.id, {
    title: "Past Practice",
    starts_at: "2026-03-01T10:00:00Z",
    ends_at: "2026-03-01T11:00:00Z",
  });
  const futureEvent = await createEvent(ORG_1, team.id, {
    title: "Future Practice",
    starts_at: "2026-04-01T10:00:00Z",
    ends_at: "2026-04-01T11:00:00Z",
  });

  const { status, body } = await listGuardianEvents(
    ORG_1,
    guardian.id,
    "?from=2026-03-15T00:00:00Z&to=2026-04-15T00:00:00Z"
  );
  assert.equal(status, 200);
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].title, futureEvent.title);
});

test("Invalid filter range rejected", async () => {
  const team = await createTeam(ORG_1, "Invalid Filter Team");
  const guardian = await createGuardian(ORG_1, "InvalidFilterGuardian");
  const player = await createPlayer(ORG_1, team.id, "InvalidFilterChild");
  await linkGuardian(ORG_1, player.id, guardian.id);

  const { status, body } = await listGuardianEvents(
    ORG_1,
    guardian.id,
    "?from=2026-05-01T00:00:00Z&to=2026-04-01T00:00:00Z"
  );
  assert.equal(status, 400);
  assert.match(body.message, /to must be later than from/i);
});

test("Cross-org guardian request returns guardian_not_found", async () => {
  const guardian = await createGuardian(ORG_1, "CrossOrgGuardian");
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/guardians/${guardian.id}/events`, {
    headers: orgAdminHeaders(ORG_2, USER_ORGADMIN_2),
  });
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, "guardian_not_found");
});

