import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000b01";
const ORG_2 = "00000000-0000-0000-0000-000000000b02";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000006001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000006002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009994";

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

const { createEvent: repoCreateEvent } = await import("../src/repositories/eventsRepo.js");

const teamCache = new Map();

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [ORG_1, "Attendance Org One", "attendance-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [ORG_2, "Attendance Org Two", "attendance-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [
      USER_PLATFORM,
      'attendance-platform-admin',
      'attendance-platform-admin@example.com',
      'Attendance Platform Admin'
    ]
  );
}

async function createTeamForOrg(orgId, name = "Attendance Team") {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams`, {
    method: "POST",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({ name, season_year: 2026 }),
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create team for org ${orgId}: ${res.status}`);
  }
  return (await res.json()).item;
}

async function ensureTeam(orgId) {
  if (!teamCache.has(orgId)) {
    const team = await createTeamForOrg(orgId);
    teamCache.set(orgId, team);
  }
  return teamCache.get(orgId);
}

async function createEvent(orgId, name = "Test Event") {
  const team = await ensureTeam(orgId);
  const event = await repoCreateEvent({
    orgId,
    teamId: team.id,
    type: "practice",
    startsAt: new Date().toISOString(),
    location: name,
    notes: name,
    createdBy: USER_PLATFORM,
  });
  return event;
}

async function createPlayer(orgId, lastName = "Player") {
  const team = await ensureTeam(orgId);
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({
      first_name: "Test",
      last_name: lastName,
      team_id: team.id,
    }),
  });
  if (res.status !== 201) {
    throw new Error(`Failed to create player for org ${orgId}: ${res.status}`);
  }
  return (await res.json()).item;
}

async function upsertAttendance({ orgId, eventId, playerId, status = "present", notes, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
    method: "POST",
    headers,
    body: JSON.stringify({ player_id: playerId, status, notes }),
  });
  return { status: res.status, body: await res.json() };
}

async function listEventAttendance({ orgId, eventId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events/${eventId}/attendance`, {
    method: "GET",
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function listPlayerAttendance({ orgId, playerId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/attendance`, {
    method: "GET",
    headers,
  });
  return { status: res.status, body: await res.json() };
}

test.before(async () => {
  teamCache.clear();
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

// UPSERT TESTS

test("Upsert: PlatformAdmin can mark attendance", async () => {
  const event = await createEvent(ORG_1, "Plat Event");
  const player = await createPlayer(ORG_1, "Plat Player");

  const { status, body } = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    headers: platformHeaders,
  });

  assert.equal(status, 200);
  assert.equal(body.attendance.status, "present");
});

test("Upsert: OrgAdmin scoped to org can mark attendance", async () => {
  const event = await createEvent(ORG_1, "Org Event");
  const player = await createPlayer(ORG_1, "Org Player");

  const { status, body } = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "late",
    notes: "  running late  ",
  });

  assert.equal(status, 200);
  assert.equal(body.attendance.status, "late");
  assert.equal(body.attendance.notes, "running late");
});

test("Upsert: wrong-org OrgAdmin forbidden", async () => {
  const event = await createEvent(ORG_2, "Forbidden Event");
  const player = await createPlayer(ORG_2, "Forbidden Player");

  const { status, body } = await upsertAttendance({
    orgId: ORG_2,
    eventId: event.id,
    playerId: player.id,
    headers: headersForOrgAdmin(ORG_1, USER_ORGADMIN_2),
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Upsert: missing event", async () => {
  const player = await createPlayer(ORG_1, "Missing Event Player");

  const { status, body } = await upsertAttendance({
    orgId: ORG_1,
    eventId: "00000000-0000-0000-0000-00000000abcd",
    playerId: player.id,
  });

  assert.equal(status, 404);
  assert.equal(body.error, "event_not_found");
});

test("Upsert: missing player", async () => {
  const event = await createEvent(ORG_1, "Missing Player Event");

  const { status, body } = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: "00000000-0000-0000-0000-00000000abcd",
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Upsert: status validation", async () => {
  const event = await createEvent(ORG_1, "Status Event");
  const player = await createPlayer(ORG_1, "Status Player");

  const { status, body } = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "pending",
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

test("Upsert: updates existing row", async () => {
  const event = await createEvent(ORG_1, "Upsert Event");
  const player = await createPlayer(ORG_1, "Upsert Player");

  await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: player.id, status: "present" });
  const second = await upsertAttendance({
    orgId: ORG_1,
    eventId: event.id,
    playerId: player.id,
    status: "excused",
    notes: "  family  ",
  });

  assert.equal(second.status, 200);
  assert.equal(second.body.attendance.status, "excused");
  assert.equal(second.body.attendance.notes, "family");
});

// EVENT LIST TESTS

test("List event attendance: success + ordering", async () => {
  const event = await createEvent(ORG_1, "List Event");
  const players = [
    await createPlayer(ORG_1, "Alpha"),
    await createPlayer(ORG_1, "Beta"),
    await createPlayer(ORG_1, "Charlie"),
  ];

  for (const player of players) {
    await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: player.id, status: "present" });
  }

  const { status, body } = await listEventAttendance({ orgId: ORG_1, eventId: event.id });
  assert.equal(status, 200);
  const timestamps = body.attendance.map((a) => a.created_at);
  assert.deepEqual(timestamps, [...timestamps].sort());
});

test("List event attendance: wrong-org forbidden", async () => {
  const event = await createEvent(ORG_1, "Forbidden List Event");

  const { status, body } = await listEventAttendance({
    orgId: ORG_1,
    eventId: event.id,
    headers: headersForOrgAdmin(ORG_2, USER_ORGADMIN_2),
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("List event attendance: missing event", async () => {
  const { status, body } = await listEventAttendance({
    orgId: ORG_1,
    eventId: "00000000-0000-0000-0000-00000000abcd",
  });

  assert.equal(status, 404);
  assert.equal(body.error, "event_not_found");
});

test("List event attendance: empty list returns []", async () => {
  const event = await createEvent(ORG_1, "Empty Event");
  const { status, body } = await listEventAttendance({ orgId: ORG_1, eventId: event.id });
  assert.equal(status, 200);
  assert.deepEqual(body.attendance, []);
});

// PLAYER LIST TESTS

test("List player attendance: success + ordering", async () => {
  const player = await createPlayer(ORG_1, "Player Attendance");
  const events = [
    await createEvent(ORG_1, "Event A"),
    await createEvent(ORG_1, "Event B"),
  ];

  for (const event of events) {
    await upsertAttendance({ orgId: ORG_1, eventId: event.id, playerId: player.id, status: "present" });
  }

  const { status, body } = await listPlayerAttendance({ orgId: ORG_1, playerId: player.id });
  assert.equal(status, 200);
  const timestamps = body.attendance.map((a) => a.created_at);
  assert.deepEqual(timestamps, [...timestamps].sort());
});

test("List player attendance: wrong-org forbidden", async () => {
  const player = await createPlayer(ORG_1, "Player Forbidden");

  const { status, body } = await listPlayerAttendance({
    orgId: ORG_1,
    playerId: player.id,
    headers: headersForOrgAdmin(ORG_2, USER_ORGADMIN_2),
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("List player attendance: missing player", async () => {
  const { status, body } = await listPlayerAttendance({
    orgId: ORG_1,
    playerId: "00000000-0000-0000-0000-00000000abcd",
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("List player attendance: empty list returns []", async () => {
  const player = await createPlayer(ORG_1, "Player Empty");
  const { status, body } = await listPlayerAttendance({ orgId: ORG_1, playerId: player.id });
  assert.equal(status, 200);
  assert.deepEqual(body.attendance, []);
});
