import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");
const { createEvent: repoCreateEvent } = await import("../src/repositories/eventsRepo.js");

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000c01";
const ORG_2 = "00000000-0000-0000-0000-000000000c02";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000007001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-000000007002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009993";

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

const teamCache = new Map();

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [ORG_1, "Evaluations Org One", "evaluations-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [ORG_2, "Evaluations Org Two", "evaluations-org-two"]
  );
}

async function createTeamForOrg(orgId, name = "Evaluations Team") {
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

async function createPlayer(orgId, lastName = "Player") {
  const team = await ensureTeam(orgId);
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers: headersForOrgAdmin(orgId),
    body: JSON.stringify({ first_name: "Eval", last_name: lastName, team_id: team.id }),
  });
  if (res.status !== 201) throw new Error(`createPlayer failed: ${res.status}`);
  return (await res.json()).item;
}

async function createEvent(orgId, name) {
  const team = await ensureTeam(orgId);
  const event = await repoCreateEvent({
    orgId,
    teamId: team.id,
    type: "practice",
    startsAt: new Date().toISOString(),
    createdBy: USER_PLATFORM,
    notes: name,
    location: name,
  });
  return event;
}

async function createEvaluation({ orgId, playerId, headers = headersForOrgAdmin(orgId), body }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/evaluations`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

async function listEvaluations({ orgId, playerId, headers = headersForOrgAdmin(orgId) }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/evaluations`, {
    headers,
  });
  return { status: res.status, body: await res.json() };
}

async function patchEvaluation({ orgId, playerId, evaluationId, headers = headersForOrgAdmin(orgId), body }) {
  const res = await fetch(
    `${baseUrl}/admin/clubs/${orgId}/players/${playerId}/evaluations/${evaluationId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }
  );
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

// CREATE TESTS

test("Create evaluation: PlatformAdmin success", async () => {
  const player = await createPlayer(ORG_1, "PlatEval");
  const event = await createEvent(ORG_1, "Plat Event");

  const { status, body } = await createEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    headers: platformHeaders,
    body: { title: "Review", event_id: event.id, rating: 4 },
  });

  assert.equal(status, 201);
  assert.equal(body.evaluation.title, "Review");
  assert.equal(body.evaluation.rating, 4);
});

test("Create evaluation: OrgAdmin success", async () => {
  const player = await createPlayer(ORG_1, "OrgEval");

  const { status, body } = await createEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    body: { title: "Org Review", summary: "  Great job  ", rating: 5 },
  });

  assert.equal(status, 201);
  assert.equal(body.evaluation.summary, "Great job");
});

test("Create evaluation: wrong-org OrgAdmin forbidden", async () => {
  const player = await createPlayer(ORG_2, "Forbidden");

  const { status, body } = await createEvaluation({
    orgId: ORG_2,
    playerId: player.id,
    headers: headersForOrgAdmin(ORG_1, USER_ORGADMIN_2),
    body: { title: "Denied" },
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("Create evaluation: missing player", async () => {
  const { status, body } = await createEvaluation({
    orgId: ORG_1,
    playerId: "00000000-0000-0000-0000-00000000abcd",
    body: { title: "Missing" },
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("Create evaluation: missing event", async () => {
  const player = await createPlayer(ORG_1, "MissingEvent");

  const { status, body } = await createEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    body: { title: "Event Missing", event_id: "00000000-0000-0000-0000-00000000abcd" },
  });

  assert.equal(status, 404);
  assert.equal(body.error, "event_not_found");
});

test("Create evaluation: title required", async () => {
  const player = await createPlayer(ORG_1, "NoTitle");

  const { status, body } = await createEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    body: { summary: "Missing title" },
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

test("Create evaluation: rating validation", async () => {
  const player = await createPlayer(ORG_1, "BadRating");

  const { status, body } = await createEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    body: { title: "Rating", rating: 10 },
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

// LIST TESTS

test("List evaluations: ordered by created_at desc", async () => {
  const player = await createPlayer(ORG_1, "ListOrderPlayer");
  await createEvaluation({ orgId: ORG_1, playerId: player.id, body: { title: "Older" } });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await createEvaluation({ orgId: ORG_1, playerId: player.id, body: { title: "Newer" } });

  const { status, body } = await listEvaluations({ orgId: ORG_1, playerId: player.id });
  assert.equal(status, 200);
  assert.equal(body.evaluations[0].title, "Newer");
});

test("List evaluations: wrong-org forbidden", async () => {
  const player = await createPlayer(ORG_1, "ListForbidden");

  const { status, body } = await listEvaluations({
    orgId: ORG_1,
    playerId: player.id,
    headers: headersForOrgAdmin(ORG_2, USER_ORGADMIN_2),
  });

  assert.equal(status, 403);
  assert.equal(body.error, "forbidden");
});

test("List evaluations: missing player", async () => {
  const { status, body } = await listEvaluations({
    orgId: ORG_1,
    playerId: "00000000-0000-0000-0000-00000000abcd",
  });

  assert.equal(status, 404);
  assert.equal(body.error, "player_not_found");
});

test("List evaluations: empty list returns []", async () => {
  const player = await createPlayer(ORG_1, "ListEmpty");
  const { status, body } = await listEvaluations({ orgId: ORG_1, playerId: player.id });
  assert.equal(status, 200);
  assert.deepEqual(body.evaluations, []);
});

// PATCH TESTS

test("Patch evaluation: success", async () => {
  const player = await createPlayer(ORG_1, "PatchSuccess");
  const created = await createEvaluation({ orgId: ORG_1, playerId: player.id, body: { title: "Initial" } });

  const { status, body } = await patchEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    evaluationId: created.body.evaluation.id,
    body: { summary: "  Updated  ", rating: 3, status: "draft" },
  });

  assert.equal(status, 200);
  assert.equal(body.evaluation.summary, "Updated");
  assert.equal(body.evaluation.rating, 3);
  assert.equal(body.evaluation.status, "draft");
});

test("Patch evaluation: empty body rejected", async () => {
  const player = await createPlayer(ORG_1, "PatchEmpty");
  const created = await createEvaluation({ orgId: ORG_1, playerId: player.id, body: { title: "Initial" } });

  const { status, body } = await patchEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    evaluationId: created.body.evaluation.id,
    body: {},
  });

  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

test("Patch evaluation: unknown field rejected", async () => {
  const player = await createPlayer(ORG_1, "PatchUnknown");
  const created = await createEvaluation({ orgId: ORG_1, playerId: player.id, body: { title: "Initial" } });

  const { status, body } = await patchEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    evaluationId: created.body.evaluation.id,
    body: { foo: "bar" },
  });

  assert.equal(status, 400);
  assert.equal(body.message, "unknown field: foo");
});

test("Patch evaluation: missing evaluation", async () => {
  const player = await createPlayer(ORG_1, "PatchMissingEval");
  const { status, body } = await patchEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    evaluationId: "00000000-0000-0000-0000-00000000abcd",
    body: { title: "Updated" },
  });

  assert.equal(status, 404);
  assert.equal(body.error, "evaluation_not_found");
});

test("Patch evaluation: event validation", async () => {
  const player = await createPlayer(ORG_1, "PatchEvent");
  const created = await createEvaluation({ orgId: ORG_1, playerId: player.id, body: { title: "Initial" } });

  const { status, body } = await patchEvaluation({
    orgId: ORG_1,
    playerId: player.id,
    evaluationId: created.body.evaluation.id,
    body: { event_id: "00000000-0000-0000-0000-00000000abcd" },
  });

  assert.equal(status, 404);
  assert.equal(body.error, "event_not_found");
});
