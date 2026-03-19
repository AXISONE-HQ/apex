import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { createEvent } from "../src/repositories/eventsRepo.js";

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const USER_ORGADMIN = "00000000-0000-0000-0000-000000000101";
const USER_COACH = "00000000-0000-0000-0000-000000000201";

let server;
let baseUrl;
const RUN_ID = Date.now().toString(36);
let teamCounter = 1;
let planCounter = 1;
let eventCounter = 1;

function xUser({ id, roles, orgScopes, teamScopes = [] }) {
  return { id, roles, permissions: [], orgScopes, teamScopes };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

async function createTeamRecord(orgId, user) {
  const payload = {
    name: `Team ${RUN_ID}-${teamCounter++}`,
    season_year: 2026,
    season_label: "2026 Outdoor",
    sport: "soccer",
    team_level: "club",
    competition_level: "club",
    age_category: "U15",
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `team create failed: ${res.status}`);
  const body = await res.json();
  return body.item.id;
}

async function ensureTeam(orgId, user) {
  if (!ensureTeam.cache) ensureTeam.cache = new Map();
  const key = `${orgId}-${user.id}`;
  if (ensureTeam.cache.has(key)) {
    return ensureTeam.cache.get(key);
  }
  const teamId = await createTeamRecord(orgId, user);
  ensureTeam.cache.set(key, teamId);
  return teamId;
}

async function createPlan(orgId, user, overrides = {}) {
  const payload = {
    name: `Plan ${planCounter++}`,
    sport: "soccer",
    age_group: "U15",
    gender: "mixed",
    evaluation_category: "skill",
    scope: "club",
    ...overrides,
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `plan create failed: ${res.status}`);
  return (await res.json()).item;
}

async function createEventViaRoute(orgId, user, teamId) {
  const start = new Date(Date.now() + 3600_000).toISOString();
  const end = new Date(Date.now() + 7200_000).toISOString();
  const payload = {
    team_id: teamId,
    title: `Session Event ${eventCounter++}`,
    type: "practice",
    starts_at: start,
    ends_at: end,
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `event create failed: ${res.status}`);
  const body = await res.json();
  return body.event.id;
}

async function startSession(orgId, user, { eventId, planId }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-sessions/start`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify({ event_id: eventId, evaluation_plan_id: planId }),
  });
  return res;
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

test("Start session with club plan", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);

  const res = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  assert.equal(res.status, 201, `unexpected status ${res.status}`);
  const body = await res.json();
  assert.equal(body.item.event_id, eventId);
  assert.equal(body.item.evaluation_plan_id, plan.id);
  assert.equal(body.item.completed_at, null);
});

test("Start session with team plan", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "team", team_id: teamId });
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);

  const res = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.item.team_id, teamId);
});

test("Reject team mismatch for team plan", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamA = await ensureTeam(ORG_1, admin);
  const teamB = await createTeamRecord(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "team", team_id: teamA });
  const eventId = await createEventViaRoute(ORG_1, admin, teamB);

  const res = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "invalid_plan_team");
});

test("Reject duplicate session", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);

  const first = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  assert.equal(first.status, 201);
  const second = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  assert.equal(second.status, 409);
});

test("Reject event without team", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const event = await createEvent({
    orgId: ORG_1,
    teamId: null,
    title: "Orphan Event",
    type: "practice",
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 3600_000).toISOString(),
    createdBy: admin.id,
  });

  const res = await startSession(ORG_1, admin, { eventId: event.id, planId: plan.id });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "event_team_required");
});

test("List and get sessions", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);

  const startRes = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  const sessionId = (await startRes.json()).item.id;

  const listRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-sessions`, {
    headers: headersFor(admin),
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.some((s) => s.id === sessionId));

  const getRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-sessions/${sessionId}`, {
    headers: headersFor(admin),
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.item.id, sessionId);
});

test("Complete session is idempotent", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);
  const startRes = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  const sessionId = (await startRes.json()).item.id;

  const completeRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-sessions/${sessionId}/complete`, {
    method: "PATCH",
    headers: headersFor(admin),
  });
  assert.equal(completeRes.status, 200);
  const firstBody = await completeRes.json();
  assert.ok(firstBody.item.completed_at);

  const secondComplete = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-sessions/${sessionId}/complete`, {
    method: "PATCH",
    headers: headersFor(admin),
  });
  assert.equal(secondComplete.status, 200);
  const secondBody = await secondComplete.json();
  assert.equal(secondBody.item.completed_at, firstBody.item.completed_at);
});

test("Coach can start a session", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);

  const coach = xUser({ id: USER_COACH, roles: ["Coach"], orgScopes: [ORG_1], teamScopes: [teamId] });
  const res = await startSession(ORG_1, coach, { eventId, planId: plan.id });
  assert.equal(res.status, 201);
});

test("Cross-org access blocked", async () => {
  const adminOrg1 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const adminOrg2 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const teamId = await ensureTeam(ORG_1, adminOrg1);
  const plan = await createPlan(ORG_1, adminOrg1, { scope: "club" });
  const eventId = await createEventViaRoute(ORG_1, adminOrg1, teamId);

  const res = await startSession(ORG_1, adminOrg2, { eventId, planId: plan.id });
  assert.equal(res.status, 403);
});
