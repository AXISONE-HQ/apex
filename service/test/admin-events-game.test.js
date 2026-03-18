import test from "node:test";
import assert from "node:assert/strict";
import { uniqueName } from "./helpers/nameUtils.js";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

const ORG_1 = "00000000-0000-0000-0000-000000000e01";
const ORG_2 = "00000000-0000-0000-0000-000000000e02";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000008001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000008002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009992";

const externalUid = (label, id) => `${label}-${id}`;

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

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Events Game Org One", "events-game-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Events Game Org Two", "events-game-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_PLATFORM, externalUid("events-game-platform-admin", USER_PLATFORM), "platform2@example.com", "Platform Admin 2"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_1, externalUid("events-game-org-admin-1", USER_ORGADMIN_1), "events-game-orgadmin1@example.com", "Events Game Org Admin One"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_2, externalUid("events-game-org-admin-2", USER_ORGADMIN_2), "events-game-orgadmin2@example.com", "Events Game Org Admin Two"]
  );
}

async function createTeam(orgId, namePrefix = "Game Team") {
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

function defaultGamePayload(teamId, overrides = {}) {
  const starts = new Date("2026-04-01T15:00:00Z");
  const ends = new Date("2026-04-01T17:00:00Z");
  const arrival = new Date(starts.getTime() - 60 * 60 * 1000);
  return {
    team_id: teamId,
    type: "game",
    title: "League Match",
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    location: "Stadium",
    notes: "Warm up early",
    opponent_name: "Rival FC",
    location_type: "home",
    game_type: "league",
    uniform_color: "Blue",
    arrival_time: arrival.toISOString(),
    ...overrides,
  };
}

async function createEvent(orgId, payload, headers = orgAdminHeaders(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

async function listEvents(orgId, query = "", headers = orgAdminHeaders(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events${query}`, {
    method: "GET",
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function getEvent(orgId, eventId, headers = orgAdminHeaders(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}`, {
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

test("OrgAdmin can create game event with metadata", async () => {
  const team = await createTeam(ORG_1, "Org Game Team");
  const { status, body } = await createEvent(ORG_1, defaultGamePayload(team.id));
  assert.equal(status, 201);
  assert.equal(body.event.type, "game");
  assert.ok(body.event.game);
  assert.equal(body.event.game.opponent_name, "Rival FC");
});

test("Platform admin can create game event", async () => {
  const team = await createTeam(ORG_1, "Platform Game Team");
  const { status, body } = await createEvent(
    ORG_1,
    defaultGamePayload(team.id, { opponent_name: "Visitors" }),
    platformHeaders
  );
  assert.equal(status, 201);
  assert.equal(body.event.game.opponent_name, "Visitors");
});

test("Missing opponent_name is rejected", async () => {
  const team = await createTeam(ORG_1, "Missing Opponent Team");
  const payload = { ...defaultGamePayload(team.id) };
  delete payload.opponent_name;
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /opponent_name/i);
});

test("Missing location_type is rejected", async () => {
  const team = await createTeam(ORG_1, "Missing Location Team");
  const payload = { ...defaultGamePayload(team.id) };
  delete payload.location_type;
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /location_type/i);
});

test("Missing game_type is rejected", async () => {
  const team = await createTeam(ORG_1, "Missing GameType Team");
  const payload = { ...defaultGamePayload(team.id) };
  delete payload.game_type;
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /game_type/i);
});

test("Invalid location_type rejected", async () => {
  const team = await createTeam(ORG_1, "Invalid Location Team");
  const payload = { ...defaultGamePayload(team.id), location_type: "neutral" };
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /location_type/i);
});

test("Invalid game_type rejected", async () => {
  const team = await createTeam(ORG_1, "Invalid GameType Team");
  const payload = { ...defaultGamePayload(team.id), game_type: "playoff" };
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /game_type/i);
});

test("Invalid arrival_time rejected", async () => {
  const team = await createTeam(ORG_1, "Invalid Arrival Team");
  const payload = { ...defaultGamePayload(team.id), arrival_time: "not-a-date" };
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /arrival_time/i);
});

test("Game fields on practice are rejected", async () => {
  const team = await createTeam(ORG_1, "Practice Team");
  const payload = {
    ...defaultGamePayload(team.id),
    type: "practice",
  };
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /game-specific/i);
});

test("Game fields on generic event are rejected", async () => {
  const team = await createTeam(ORG_1, "Event Team");
  const payload = {
    ...defaultGamePayload(team.id),
    type: "event",
  };
  const { status, body } = await createEvent(ORG_1, payload);
  assert.equal(status, 400);
  assert.match(body.message, /game-specific/i);
});

test("List events includes game metadata and filters by team", async () => {
  const team1 = await createTeam(ORG_1, "Game Team A");
  const team2 = await createTeam(ORG_1, "Game Team B");
  await createEvent(ORG_1, defaultGamePayload(team1.id, { opponent_name: "Team Alpha" }));
  await createEvent(ORG_1, defaultGamePayload(team2.id, { opponent_name: "Team Bravo" }));
  await createEvent(ORG_2, defaultGamePayload((await createTeam(ORG_2, "Other Org Team")).id));

  const { status, body } = await listEvents(ORG_1, `?team_id=${team2.id}`);
  assert.equal(status, 200);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].game.opponent_name, "Team Bravo");
});

test("Event detail is org-scoped", async () => {
  const team = await createTeam(ORG_1, "Detail Game Team");
  const { body } = await createEvent(ORG_1, defaultGamePayload(team.id));
  const detail = await getEvent(ORG_2, body.event.id, orgAdminHeaders(ORG_2, USER_ORGADMIN_2));
  assert.equal(detail.status, 404);
  assert.equal(detail.body.error, "event_not_found");
});

test("Cross-org team usage returns 404", async () => {
  const teamOrg2 = await createTeam(ORG_2, "Org2 Game Team");
  const { status, body } = await createEvent(ORG_1, defaultGamePayload(teamOrg2.id));
  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});
