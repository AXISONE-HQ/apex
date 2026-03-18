import test from "node:test";
import assert from "node:assert/strict";
import { uniqueName } from "./helpers/nameUtils.js";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");
const { eventNotifications } = await import("../src/services/eventNotifications.js");

const ORG_1 = "00000000-0000-0000-0000-000000001601";
const ORG_2 = "00000000-0000-0000-0000-000000001602";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-00000000c001";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009989";

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

const externalUid = (label, id) => `${label}-${id}`;

async function expectEventCreate({ testName, orgId, payload, headers = orgAdminHeaders(orgId), expectedStatus = 201 }) {
  const result = await createEvent(orgId, payload, headers);
  if (result.status !== expectedStatus) {
    console.error("[admin-event-notifications] unexpected status", {
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
    [ORG_1, "Event Notify Org One", "event-notify-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Event Notify Org Two", "event-notify-org-two"]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [
      USER_ORGADMIN_1,
      externalUid("event-notify-org-admin-1", USER_ORGADMIN_1),
      "event-notify-orgadmin1@example.com",
      "Event Notify Org Admin One"
    ]
  );

  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT DO NOTHING`,
    [
      USER_PLATFORM,
      externalUid("event-notify-platform-admin", USER_PLATFORM),
      "platform5@example.com",
      "Platform Admin 5"
    ]
  );
}

async function createTeam(orgId, namePrefix = "Notify Team") {
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
    title: "Notification Practice",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    location: "Practice Gym",
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

test("Successful event creation triggers notification service", async () => {
  const team = await createTeam(ORG_1);
  let calledWith = null;

  const original = eventNotifications.notifyEventCreated;
  eventNotifications.notifyEventCreated = async (payload) => {
    calledWith = payload;
  };

  try {
    const payload = defaultEventPayload(team.id);
    const { body } = await expectEventCreate({
      testName: "Successful event creation triggers notification service",
      orgId: ORG_1,
      payload,
    });
    assert.ok(calledWith);
    assert.equal(calledWith.orgId, ORG_1);
    assert.equal(calledWith.event.id, body.event.id);
    assert.equal(calledWith.actorUserId, USER_ORGADMIN_1);
  } finally {
    eventNotifications.notifyEventCreated = original;
  }
});

test("Notification errors do not break event creation", async () => {
  const team = await createTeam(ORG_1, "Fail Team");
  const original = eventNotifications.notifyEventCreated;
  eventNotifications.notifyEventCreated = async () => {
    throw new Error("notification failure");
  };

  try {
    const payload = defaultEventPayload(team.id);
    const { body } = await expectEventCreate({
      testName: "Notification errors do not break event creation",
      orgId: ORG_1,
      payload,
    });
    assert.ok(body.event.id);
  } finally {
    eventNotifications.notifyEventCreated = original;
  }
});

test("Platform admin create still triggers notification", async () => {
  const team = await createTeam(ORG_1, "Platform Notify Team");
  let called = 0;
  const original = eventNotifications.notifyEventCreated;
  eventNotifications.notifyEventCreated = async () => {
    called += 1;
  };

  try {
    const payload = defaultEventPayload(team.id, { title: "Platform Created Event" });
    await expectEventCreate({
      testName: "Platform admin create still triggers notification",
      orgId: ORG_1,
      payload,
      headers: platformHeaders,
    });
    assert.equal(called, 1);
  } finally {
    eventNotifications.notifyEventCreated = original;
  }
});
