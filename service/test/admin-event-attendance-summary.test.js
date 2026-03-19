import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");
const { createEvent: repoCreateEvent } = await import("../src/repositories/eventsRepo.js");

const ORG_1 = "00000000-0000-0000-0000-000000001501";
const ORG_2 = "00000000-0000-0000-0000-000000001502";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-00000000b001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-00000000b002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009990";

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
let teamCounter = 1;
let playerCounter = 1;

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Attendance Summary Org One", "attendance-summary-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Attendance Summary Org Two", "attendance-summary-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_PLATFORM, "platform-admin-4", "platform4@example.com", "Platform Admin 4"]
  );
}

async function createTeam(orgId, namePrefix = "Summary Team") {
  const payload = {
    name: `${namePrefix} ${teamCounter++}`,
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

async function createPlayer(orgId, teamId, overrides = {}) {
  const payload = {
    first_name: "Player",
    last_name: `#${playerCounter++}`,
    team_id: teamId,
    ...overrides,
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create player for org ${orgId}`);
  const body = await res.json();
  return body.item;
}

async function createEvent(orgId, teamId, title = "Summary Event") {
  const startsAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return repoCreateEvent({
    orgId,
    teamId,
    title,
    type: "practice",
    startsAt,
    endsAt,
    location: "Main Field",
    notes: "Attendance summary test",
    createdBy: USER_PLATFORM,
  });
}

async function upsertAttendance({ orgId, eventId, playerId, status, notes, headers = orgAdminHeaders(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
    method: "POST",
    headers,
    body: JSON.stringify({ player_id: playerId, status, notes }),
  });
  return { status: res.status, body: await res.json() };
}

async function getSummary(orgId, eventId, headers = orgAdminHeaders(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance/summary`, {
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

test("Summary aggregates yes/no/late/excused and no_response", async () => {
  const team = await createTeam(ORG_1);
  const playerYes = await createPlayer(ORG_1, team.id, { last_name: "Responder" });
  const playerNo = await createPlayer(ORG_1, team.id, { last_name: "Decline" });
  const playerNone = await createPlayer(ORG_1, team.id, { last_name: "Missing" });
  const event = await createEvent(ORG_1, team.id);

  await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: playerYes.id, status: "yes" });
  await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: playerNo.id, status: "no" });

  const { status, body } = await getSummary(ORG_1, event.id);
  assert.equal(status, 200);
  const summary = body.summary;
  assert.equal(summary.total_players, 3);
  assert.equal(summary.yes, 1);
  assert.equal(summary.no, 1);
  assert.equal(summary.late, 0);
  assert.equal(summary.excused, 0);
  assert.equal(summary.no_response, 1);
});

test("Excused counts and inactive players excluded", async () => {
  const team = await createTeam(ORG_1);
  const activePlayer = await createPlayer(ORG_1, team.id, { last_name: "Excused" });
  await createPlayer(ORG_1, team.id, { last_name: "Inactive", status: "inactive" });
  const event = await createEvent(ORG_1, team.id);

  await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: activePlayer.id, status: "excused" });

  const { body } = await getSummary(ORG_1, event.id);
  assert.equal(body.summary.total_players, 1);
  assert.equal(body.summary.excused, 1);
  assert.equal(body.summary.no_response, 0);
});

test("Attendance for non-roster players is ignored", async () => {
  const teamA = await createTeam(ORG_1, "Team A");
  const teamB = await createTeam(ORG_1, "Team B");
  const playerA = await createPlayer(ORG_1, teamA.id, { last_name: "Roster" });
  const playerB = await createPlayer(ORG_1, teamB.id, { last_name: "Other" });
  const event = await createEvent(ORG_1, teamA.id);

  await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: playerA.id, status: "yes" });
  await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: playerB.id, status: "no" });

  const { body } = await getSummary(ORG_1, event.id);
  assert.equal(body.summary.total_players, 1);
  assert.equal(body.summary.yes, 1);
  assert.equal(body.summary.no, 0);
  assert.equal(body.summary.no_response, 0);
});

test("Summary handles events with zero players", async () => {
  const team = await createTeam(ORG_1);
  const event = await createEvent(ORG_1, team.id);
  const { body } = await getSummary(ORG_1, event.id);
  assert.equal(body.summary.total_players, 0);
  assert.equal(body.summary.no_response, 0);
});

test("Cross-org summary request returns 404", async () => {
  const team = await createTeam(ORG_1);
  const event = await createEvent(ORG_1, team.id);
  const result = await getSummary(ORG_2, event.id, orgAdminHeaders(ORG_2, USER_ORGADMIN_2));
  assert.equal(result.status, 404);
  assert.equal(result.body.error, "event_not_found");
});
