import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { listSessionEvaluationLogs } from "../src/repositories/playerEvaluationsRepo.js";

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const USER_ORGADMIN = "00000000-0000-0000-0000-000000000101";
const USER_COACH = "00000000-0000-0000-0000-000000000201";
const DB_ENABLED = Boolean(process.env.DATABASE_URL);

let server;
let baseUrl;
let teamCounter = 1;
let planCounter = 1;
let blockCounter = 1;
let playerCounter = 1;
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
    name: `Team ${teamCounter++}`,
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

async function createEvaluationBlock(orgId, user, overrides = {}) {
  const payload = {
    name: `Block ${blockCounter++}`,
    sport: "soccer",
    evaluation_type: "skill",
    scoring_method: "numeric_scale",
    scoring_config: { min: 1, max: 10 },
    instructions: "Do the drill",
    objective: "Improve",
    difficulty: "medium",
    ...overrides,
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `block create failed: ${res.status}`);
  return (await res.json()).item;
}

async function addBlockToPlan(orgId, user, planId, blockId) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify({ block_id: blockId }),
  });
  assert.equal(res.status, 201, `plan-block add failed: ${res.status}`);
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
  assert.equal(res.status, 201, `session start failed: ${res.status}`);
  return (await res.json()).item.id;
}

async function createPlayer(orgId, user, teamId) {
  const payload = {
    first_name: `Player${playerCounter}`,
    last_name: "Test",
    team_id: teamId,
  };
  playerCounter += 1;
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `player create failed: ${res.status}`);
  const body = await res.json();
  return body.item.id;
}

async function submitScore(orgId, user, sessionId, payload) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/scores`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

async function patchScore(orgId, user, sessionId, scoreId, payload) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/scores/${scoreId}`, {
    method: "PATCH",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

async function listScores(orgId, user, sessionId) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/scores`, {
    headers: headersFor(user),
  });
  return { status: res.status, body: await res.json() };
}

async function bootstrapSession({ scoringBlockOverrides = {} } = {}) {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const block = await createEvaluationBlock(ORG_1, admin, scoringBlockOverrides);
  await addBlockToPlan(ORG_1, admin, plan.id, block.id);
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);
  const sessionId = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  const playerId = await createPlayer(ORG_1, admin, teamId);
  const coach = xUser({ id: USER_COACH, roles: ["Coach"], orgScopes: [ORG_1], teamScopes: [teamId] });
  return { admin, coach, sessionId, block, playerId, teamId };
}

function assertScoreItem(item) {
  assert.ok(item.id);
  assert.ok(item.player_id);
  assert.ok(item.block_id);
  assert.ok(item.score);
}

test.before(async () => {
  if (DB_ENABLED) {
    const { query } = await import("../src/db/client.js");
    await query(
      `INSERT INTO organizations (id, name, slug, state_province, country, pulse_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         state_province = EXCLUDED.state_province,
         country = EXCLUDED.country,
         pulse_score = EXCLUDED.pulse_score`,
      [ORG_1, "Org One", "org-one", "Ontario", "Canada", 50]
    );
    await query(
      `INSERT INTO organizations (id, name, slug, state_province, country, pulse_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         state_province = EXCLUDED.state_province,
         country = EXCLUDED.country,
         pulse_score = EXCLUDED.pulse_score`,
      [ORG_2, "Org Two", "org-two", "Ontario", "Canada", 50]
    );
    const userSeeds = [
      { id: USER_ORGADMIN, external: "ext-admin", email: "orgadmin@example.com", name: "Org Admin" },
      { id: USER_COACH, external: "ext-coach", email: "coach@example.com", name: "Coach" },
    ];
    for (const seed of userSeeds) {
      await query(
        `INSERT INTO users (id, external_uid, email, name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           external_uid = EXCLUDED.external_uid,
           email = EXCLUDED.email,
           name = EXCLUDED.name`,
        [seed.id, seed.external, seed.email, seed.name]
      );
    }
  }
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

test("Submit numeric score", async () => {
  const { admin, sessionId, block, playerId } = await bootstrapSession({
    scoringBlockOverrides: {
      scoring_method: "numeric_scale",
      scoring_config: { min: 1, max: 5 },
    },
  });

  const { status, body } = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 4 },
  });
  assert.equal(status, 201);
  assert.equal(body.item.score.value, 4);
});

test("Submit rating score", async () => {
  const { admin, sessionId, block, playerId } = await bootstrapSession({
    scoringBlockOverrides: {
      scoring_method: "rating_scale",
      scoring_config: { options: ["poor", "good", "great"] },
    },
  });

  const { status, body } = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { rating: "good" },
  });
  assert.equal(status, 201);
  assert.equal(body.item.score.rating, "good");
});

test("Submit custom metric score", async () => {
  const { admin, sessionId, block, playerId } = await bootstrapSession({
    scoringBlockOverrides: {
      scoring_method: "custom_metric",
      scoring_config: { unit: "seconds", value_label: "time" },
    },
  });

  const { status, body } = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 12.5, unit: "seconds" },
    notes: "Great pace",
  });
  assert.equal(status, 201);
  assert.equal(body.item.score.value, 12.5);
  assert.equal(body.item.score.unit, "seconds");
  assert.equal(body.item.notes, "Great pace");
});

test("Invalid score shape rejected", async () => {
  const { admin, sessionId, block, playerId } = await bootstrapSession();

  const { status, body } = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: "bad" },
  });
  assert.equal(status, 400);
  assert.equal(body.error, "bad_request");
});

test("Block not in plan rejected", async () => {
  const { admin, sessionId, playerId } = await bootstrapSession();
  const extraBlock = await createEvaluationBlock(ORG_1, admin);

  const { status, body } = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: extraBlock.id,
    score: { value: 3 },
  });
  assert.equal(status, 400);
  assert.equal(body.message, "block is not part of the evaluation plan");
});

test("Player not on session team rejected", async () => {
  const { admin, sessionId, block } = await bootstrapSession();
  const otherTeamId = await createTeamRecord(ORG_1, admin);
  const otherPlayerId = await createPlayer(ORG_1, admin, otherTeamId);

  const { status, body } = await submitScore(ORG_1, admin, sessionId, {
    player_id: otherPlayerId,
    block_id: block.id,
    score: { value: 2 },
  });
  assert.equal(status, 400);
  assert.equal(body.message, "player_not_on_team");
});

test("POST upsert updates existing score and logs", async () => {
  const { admin, sessionId, block, playerId } = await bootstrapSession();

  const first = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 2 },
  });
  assert.equal(first.status, 201);
  const evaluationId = first.body.item.id;
  let logs = await listSessionEvaluationLogs({ playerEvaluationId: evaluationId });
  assert.equal(logs.length, 0);

  const second = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 5 },
  });
  assert.equal(second.status, 201);
  assert.equal(second.body.item.score.value, 5);
  logs = await listSessionEvaluationLogs({ playerEvaluationId: evaluationId });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].new_score.value, 5);
});

test("PATCH update modifies score and logs", async () => {
  const { admin, sessionId, block, playerId } = await bootstrapSession();
  const created = await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 1 },
  });
  const evaluationId = created.body.item.id;

  const patch = await patchScore(ORG_1, admin, sessionId, evaluationId, {
    score: { value: 4 },
  });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.item.score.value, 4);
  const logs = await listSessionEvaluationLogs({ playerEvaluationId: evaluationId });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].new_score.value, 4);
});

test("List session scores returns player and block data", async () => {
  const { admin, sessionId, block, playerId } = await bootstrapSession();
  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 3 },
    notes: "solid",
  });

  const { status, body } = await listScores(ORG_1, admin, sessionId);
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.items));
  assert.equal(body.items.length >= 1, true);
  const scoreItem = body.items[0];
  assert.ok(scoreItem.player);
  assert.ok(scoreItem.block);
});

test("Coach can submit score", async () => {
  const { coach, sessionId, block, playerId } = await bootstrapSession();
  const { status } = await submitScore(ORG_1, coach, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 4 },
  });
  assert.equal(status, 201);
});

test("Cross-org access blocked", async () => {
  const { sessionId, block, playerId } = await bootstrapSession();
  const otherAdmin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const { status } = await submitScore(ORG_1, otherAdmin, sessionId, {
    player_id: playerId,
    block_id: block.id,
    score: { value: 2 },
  });
  assert.equal(status, 403);
});
