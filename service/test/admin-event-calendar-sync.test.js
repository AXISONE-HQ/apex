import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");
const { eventCalendarSync } = await import("../src/services/eventCalendarSync.js");

const ORG_1 = "00000000-0000-0000-0000-000000001701";
const ORG_2 = "00000000-0000-0000-0000-000000001702";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-00000000d001";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009988";

const TEAM_RUN_SALT = Date.now().toString(36);
let teamCounter = 1;
function uniqueTeamName(prefix = "Sync Team") {
  return `${prefix} ${TEAM_RUN_SALT}-${teamCounter++}`;
}


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
  const { ensureMembershipRole } = await import("../src/repositories/membershipsRepo.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Event Sync Org One", "event-sync-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Event Sync Org Two", "event-sync-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_PLATFORM, "platform-admin-6", "platform6@example.com", "Platform Admin 6"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_1, "event-sync-orgadmin", "eventsync-admin@example.com", "Event Sync OrgAdmin"]
  );

  await ensureMembershipRole({ userId: USER_ORGADMIN_1, orgId: ORG_1, roleCode: "OrgAdmin" });
}

async function createTeam(orgId, namePrefix = "Sync Team") {
  const payload = {
    name: uniqueTeamName(namePrefix),
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
  if (res.status !== 201) {
    let bodyText = await res.text();
    throw new Error(`failed to create team for org ${orgId} -> ${res.status}: ${bodyText}`);
  }
  const body = await res.json();
  return body.item;
}

function defaultEventPayload(teamId, overrides = {}) {
  return {
    team_id: teamId,
    type: "practice",
    title: "Calendar Sync Event",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    location: "Training Facility",
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

test.before(async () => {
  if (process.env.DATABASE_URL) await seedDb();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server?.close) await new Promise((resolve) => server.close(resolve));
});

test("Calendar sync invoked on practice event creation", async () => {
  const team = await createTeam(ORG_1);
  let calledWith = null;
  const original = eventCalendarSync.syncEventCreated;
  eventCalendarSync.syncEventCreated = async (payload) => {
    calledWith = payload;
  };

  try {
    const { status, body } = await createEvent(ORG_1, defaultEventPayload(team.id));
    assert.equal(status, 201);
    assert.ok(calledWith);
    assert.equal(calledWith.orgId, ORG_1);
    assert.equal(calledWith.event.id, body.event.id);
  } finally {
    eventCalendarSync.syncEventCreated = original;
  }
});

test("Calendar sync errors do not break event creation", async () => {
  const team = await createTeam(ORG_1, "Fail Sync Team");
  const original = eventCalendarSync.syncEventCreated;
  eventCalendarSync.syncEventCreated = async () => {
    throw new Error("calendar sync failure");
  };

  try {
    const { status, body } = await createEvent(ORG_1, defaultEventPayload(team.id));
    assert.equal(status, 201);
    assert.ok(body.event.id);
  } finally {
    eventCalendarSync.syncEventCreated = original;
  }
});

test("Platform admin event creation triggers calendar sync", async () => {
  const team = await createTeam(ORG_1, "Platform Sync Team");
  let called = 0;
  const original = eventCalendarSync.syncEventCreated;
  eventCalendarSync.syncEventCreated = async () => {
    called += 1;
  };

  try {
    const result = await createEvent(
      ORG_1,
      defaultEventPayload(team.id, { type: "game", opponent_name: "Opp FC", location_type: "home", game_type: "league" }),
      platformHeaders
    );
    assert.equal(result.status, 201);
    assert.equal(called, 1);
  } finally {
    eventCalendarSync.syncEventCreated = original;
  }
});

test("Invalid payload does not invoke calendar sync", async () => {
  const team = await createTeam(ORG_1, "Invalid Sync Team");
  const original = eventCalendarSync.syncEventCreated;
  let called = 0;
  eventCalendarSync.syncEventCreated = async () => {
    called += 1;
  };

  try {
    const badPayload = { ...defaultEventPayload(team.id), title: "" };
    const { status } = await createEvent(ORG_1, badPayload);
    assert.equal(status, 400);
    assert.equal(called, 0);
  } finally {
    eventCalendarSync.syncEventCreated = original;
  }
});

test("Cross-org request cannot access summary or sync", async () => {
  const team = await createTeam(ORG_1, "Scoped Sync Team");
  const { body } = await createEvent(ORG_1, defaultEventPayload(team.id));
  const original = eventCalendarSync.syncEventCreated;
  eventCalendarSync.syncEventCreated = async () => {
    throw new Error("should not be called");
  };

  try {
    const res = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/events/${body.event.id}/attendance/summary`, {
      method: "GET",
      headers: orgAdminHeaders(ORG_2, USER_ORGADMIN_1),
    });
    assert.equal(res.status, 404);
  } finally {
    eventCalendarSync.syncEventCreated = original;
  }
});
