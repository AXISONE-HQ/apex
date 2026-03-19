import test from "node:test";
import assert from "node:assert/strict";
import { uniqueName } from "./helpers/nameUtils.js";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

const ORG_1 = "00000000-0000-0000-0000-000000000d01";
const ORG_2 = "00000000-0000-0000-0000-000000000d02";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000007001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000007002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009993";

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

async function expectEventCreate({ testName, orgId, payload, headers = orgAdminHeaders(orgId), expectedStatus = 201 }) {
  const result = await createEvent(orgId, payload, headers);
  if (result.status !== expectedStatus) {
    console.error("[admin-events-practice] unexpected status", {
      testName,
      expectedStatus,
      status: result.status,
      body: result.body,
      orgId,
      teamId: payload?.team_id,
      payload,
    });
  }
  assert.equal(result.status, expectedStatus);
  return result;
}

let server;
let baseUrl;

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Events Org One", "events-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Events Org Two", "events-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_PLATFORM, externalUid("events-practice-platform-admin", USER_PLATFORM), "platform@example.com", "Platform Admin"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_1, externalUid("events-practice-org-admin-1", USER_ORGADMIN_1), "events-orgadmin1@example.com", "Events Org Admin One"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_2, externalUid("events-practice-org-admin-2", USER_ORGADMIN_2), "events-orgadmin2@example.com", "Events Org Admin Two"]
  );
}

async function createTeam(orgId, namePrefix = "Training Team") {
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

function defaultEventPayload(teamId, overrides = {}) {
  return {
    team_id: teamId,
    type: "practice",
    title: "Morning Practice",
    starts_at: new Date("2026-03-07T10:00:00Z").toISOString(),
    ends_at: new Date("2026-03-07T12:00:00Z").toISOString(),
    location: "Training Center",
    notes: "Bring water",
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

test("OrgAdmin can create practice event", async () => {
  const team = await createTeam(ORG_1, "Org Practice Team");
  const payload = defaultEventPayload(team.id);
  const { body } = await expectEventCreate({
    testName: "OrgAdmin can create practice event",
    orgId: ORG_1,
    payload,
  });
  assert.equal(body.event.type, "practice");
  assert.equal(body.event.title, "Morning Practice");
});

test("Platform admin can create event for any org", async () => {
  const team = await createTeam(ORG_1, "Platform Team");
  const payload = defaultEventPayload(team.id, { title: "Platform Practice" });
  const { body } = await expectEventCreate({
    testName: "Platform admin can create event for any org",
    orgId: ORG_1,
    payload,
    headers: platformHeaders,
  });
  assert.equal(body.event.title, "Platform Practice");
});

test("Unknown fields are rejected", async () => {
  const team = await createTeam(ORG_1, "Unknown Field Team");
  const { status, body } = await createEvent(ORG_1, {
    ...defaultEventPayload(team.id),
    extra: "nope",
  });
  assert.equal(status, 400);
  assert.match(body.message, /unknown field/i);
});

test("Invalid type is rejected", async () => {
  const team = await createTeam(ORG_1, "Type Team");
  const { status, body } = await createEvent(ORG_1, {
    ...defaultEventPayload(team.id),
    type: "tournament",
  });
  assert.equal(status, 400);
  assert.match(body.message, /type must be one of/i);
});

test("Missing required fields fail", async () => {
  const team = await createTeam(ORG_1, "Missing Field Team");
  const { status, body } = await createEvent(ORG_1, {
    team_id: team.id,
    type: "practice",
  });
  assert.equal(status, 400);
  assert.match(body.message, /title is required/i);
});

test("ends_at must be later than starts_at", async () => {
  const team = await createTeam(ORG_1, "Time Team");
  const start = new Date("2026-03-07T10:00:00Z").toISOString();
  const end = new Date("2026-03-07T09:00:00Z").toISOString();
  const { status, body } = await createEvent(ORG_1, {
    ...defaultEventPayload(team.id),
    starts_at: start,
    ends_at: end,
  });
  assert.equal(status, 400);
  assert.match(body.message, /ends_at must be later/i);
});

test("Team from another org is rejected", async () => {
  const teamOrg2 = await createTeam(ORG_2, "Cross Org Team");
  const { status, body } = await createEvent(ORG_1, defaultEventPayload(teamOrg2.id));
  assert.equal(status, 404);
  assert.equal(body.error, "team_not_found");
});

test("List events is scoped to org and filters by team", async () => {
  const team1 = await createTeam(ORG_1, "Org1 Team A");
  const team2 = await createTeam(ORG_1, "Org1 Team B");
  await createEvent(ORG_1, defaultEventPayload(team1.id, { title: "Team A Practice" }));
  await createEvent(ORG_1, defaultEventPayload(team2.id, { title: "Team B Practice" }));
  await createEvent(ORG_2, defaultEventPayload((await createTeam(ORG_2, "Org2 Team")).id));

  const { status, body } = await listEvents(ORG_1, `?team_id=${team2.id}`);
  assert.equal(status, 200);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].title, "Team B Practice");
});

test("Event detail returns 404 for wrong org", async () => {
  const team = await createTeam(ORG_1, "Detail Team");
  const { body } = await createEvent(ORG_1, defaultEventPayload(team.id));
  const detail = await getEvent(ORG_2, body.event.id, orgAdminHeaders(ORG_2, USER_ORGADMIN_2));
  assert.equal(detail.status, 404);
  assert.equal(detail.body.error, "event_not_found");
});
