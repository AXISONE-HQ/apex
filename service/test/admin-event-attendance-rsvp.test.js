import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

const ORG_1 = "00000000-0000-0000-0000-000000000f01";
const ORG_2 = "00000000-0000-0000-0000-000000000f02";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-00000000a001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-00000000a002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009991";

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
    [ORG_1, "Events RSVP Org One", "events-rsvp-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Events RSVP Org Two", "events-rsvp-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_PLATFORM, "platform-admin-3", "platform3@example.com", "Platform Admin 3"]
  );
}

let teamCounter = 1;

async function createTeam(orgId, namePrefix = "RSVP Team") {
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

async function createPlayer(orgId, teamId, lastName = "RSVP") {
  const payload = {
    first_name: "Test",
    last_name: lastName,
    team_id: teamId,
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

const { createEvent: repoCreateEvent } = await import("../src/repositories/eventsRepo.js");

async function createEvent(orgId, teamId, title = "RSVP Event") {
  const event = await repoCreateEvent({
    orgId,
    teamId,
    title,
    type: "practice",
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    location: "Gym",
    notes: "Attendance",
    createdBy: USER_PLATFORM,
  });
  return event;
}

async function upsertAttendance({ orgId, eventId, playerId, status, notes, headers = orgAdminHeaders(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
    method: "POST",
    headers,
    body: JSON.stringify({ player_id: playerId, status, notes }),
  });
  return { status: res.status, body: await res.json() };
}

async function listAttendance({ orgId, eventId, headers = orgAdminHeaders(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
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

test("Legacy status 'present' still works", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "Legacy");
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "present",
  });

  assert.equal(status, 200);
  assert.equal(body.attendance.status, "present");
});

test("RSVP 'yes' stores as present", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "Yes");
  const event = await createEvent(ORG_1, team.id);

  const result = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "yes",
    notes: "Bringing water",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.attendance.status, "present");
  assert.equal(result.body.attendance.notes, "Bringing water");

  const list = await listAttendance({ orgId: ORG_1, eventId: event.id });
  assert.equal(list.status, 200);
  assert.equal(list.body.attendance[0].status, "present");
});

test("RSVP 'no' stores as absent", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "Nope");
  const event = await createEvent(ORG_1, team.id);

  const result = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "no",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.attendance.status, "absent");

  const list = await listAttendance({ orgId: ORG_1, eventId: event.id });
  assert.equal(list.body.attendance[0].status, "absent");
});

test("RSVP 'late' stores as late", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "LateRSVP");
  const event = await createEvent(ORG_1, team.id);

  const result = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "late",
    notes: "10 mins late",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.attendance.status, "late");
  assert.equal(result.body.attendance.notes, "10 mins late");
});

test("Legacy 'excused' still works", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "Excused");
  const event = await createEvent(ORG_1, team.id);

  const result = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "excused",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.attendance.status, "excused");
});

test("Invalid RSVP value is rejected", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "Invalid");
  const event = await createEvent(ORG_1, team.id);

  const result = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "maybe",
  });

  assert.equal(result.status, 400);
  assert.match(result.body.message, /status must be one of/i);
});

test("Unknown field is rejected", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "UnknownField");
  const event = await createEvent(ORG_1, team.id);

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/events/${event.id}/attendance`, {
    method: "POST",
    headers: orgAdminHeaders(ORG_1),
    body: JSON.stringify({ player_id: player.id, status: "yes", extra: true }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.message, /unknown field/i);
});

test("Notes over 500 chars rejected", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "LongNote");
  const event = await createEvent(ORG_1, team.id);

  const longNote = "x".repeat(501);
  const { status, body } = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "yes",
    notes: longNote,
  });

  assert.equal(status, 400);
  assert.match(body.message, /notes must be at most 500 characters/i);
});

test("Cross-org team still rejected", async () => {
  const teamOrg2 = await createTeam(ORG_2);
  const playerOrg2 = await createPlayer(ORG_2, teamOrg2.id, "WrongOrg");
  const eventOrg1 = await createEvent(ORG_1, (await createTeam(ORG_1, "Local Team")).id);

  const result = await upsertAttendance({
    orgId: ORG_1,
    eventId: eventOrg1.id,
    playerId: playerOrg2.id,
    status: "yes",
  });

  assert.equal(result.status, 404);
  assert.equal(result.body.error, "player_not_found");
});
