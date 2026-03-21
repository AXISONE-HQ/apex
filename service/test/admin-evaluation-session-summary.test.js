import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import app from "../src/server.js";

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const USER_ORGADMIN = "00000000-0000-0000-0000-000000000101";

let server;
let baseUrl;
let teamCounter = 1;
let planCounter = 1;
let blockCounter = 1;
let playerCounter = 1;
let eventCounter = 1;

function xUser({ id, roles, orgScopes }) {
  return { id, roles, permissions: [], orgScopes, teamScopes: [] };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

async function createTeamRecord(orgId, user) {
  const payload = {
    name: `Team ${teamCounter++}-${randomUUID().slice(0, 8)}`,
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
    scoring_config: { min: 1, max: 5 },
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
  assert.equal(res.status, 201, `score submit failed: ${res.status}`);
  return res.json();
}

async function getSessionSummary(orgId, user, sessionId) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/summary`, {
    headers: headersFor(user),
  });
  return { status: res.status, body: await res.json() };
}

async function getPlayerSummary(orgId, user, sessionId, playerId) {
  const res = await fetch(
    `${baseUrl}/admin/clubs/${orgId}/evaluation-sessions/${sessionId}/players/${playerId}/summary`,
    { headers: headersFor(user) }
  );
  return { status: res.status, body: await res.json() };
}

function assertApprox(actual, expected, delta = 0.001) {
  assert.ok(Math.abs(actual - expected) <= delta, `expected ${actual} ≈ ${expected}`);
}

async function bootstrapSession({ blockConfigs = [] } = {}) {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1, admin);
  const plan = await createPlan(ORG_1, admin, { scope: "club" });
  const blocks = [];
  for (const cfg of blockConfigs) {
    const block = await createEvaluationBlock(ORG_1, admin, cfg);
    await addBlockToPlan(ORG_1, admin, plan.id, block.id);
    blocks.push(block);
  }
  const eventId = await createEventViaRoute(ORG_1, admin, teamId);
  const sessionId = await startSession(ORG_1, admin, { eventId, planId: plan.id });
  return { admin, sessionId, blocks, teamId };
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

test("Session summary aggregates normalized scores", async () => {
  const { admin, sessionId, blocks, teamId } = await bootstrapSession({
    blockConfigs: [
      { scoring_method: "numeric_scale", scoring_config: { min: 1, max: 5 } },
      { scoring_method: "rating_scale", scoring_config: { options: ["poor", "good", "great"] } },
    ],
  });
  const [numericBlock, ratingBlock] = blocks;
  const playerOne = await createPlayer(ORG_1, admin, teamId);
  const playerTwo = await createPlayer(ORG_1, admin, teamId);

  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerOne,
    block_id: numericBlock.id,
    score: { value: 4 },
  });
  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerTwo,
    block_id: numericBlock.id,
    score: { value: 2 },
  });
  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerOne,
    block_id: ratingBlock.id,
    score: { rating: "great" },
  });
  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerTwo,
    block_id: ratingBlock.id,
    score: { rating: "good" },
  });

  const { status, body } = await getSessionSummary(ORG_1, admin, sessionId);
  assert.equal(status, 200);
  const summary = body.item;
  assert.equal(summary.session_id, sessionId);
  assert.equal(summary.players_evaluated, 2);
  assert.equal(summary.blocks_evaluated, blocks.length);
  assert.equal(summary.average_scores_by_block.length, 2);

  const numericAvg = summary.average_scores_by_block.find((b) => b.block_id === numericBlock.id);
  assertApprox(numericAvg.average_score, (75 + 25) / 2);
  const ratingAvg = summary.average_scores_by_block.find((b) => b.block_id === ratingBlock.id);
  assertApprox(ratingAvg.average_score, (100 + 50) / 2);

  assert.equal(summary.top_players.length, 2);
  assertApprox(summary.top_players[0].overall_score, (75 + 100) / 2);
  assertApprox(summary.lowest_players[0].overall_score, (25 + 50) / 2);
});

test("Player summary returns normalized block scores", async () => {
  const { admin, sessionId, blocks, teamId } = await bootstrapSession({
    blockConfigs: [
      { scoring_method: "numeric_scale", scoring_config: { min: 0, max: 10 } },
      { scoring_method: "custom_metric", scoring_config: { unit: "seconds" } },
    ],
  });
  const [numericBlock, customBlock] = blocks;
  const playerId = await createPlayer(ORG_1, admin, teamId);

  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: numericBlock.id,
    score: { value: 7 },
  });
  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: customBlock.id,
    score: { value: 82, unit: "seconds" },
  });

  const { status, body } = await getPlayerSummary(ORG_1, admin, sessionId, playerId);
  assert.equal(status, 200);
  const summary = body.item;
  assert.equal(summary.player_id, playerId);
  assert.equal(summary.blocks.length, 2);
  const numericEntry = summary.blocks.find((b) => b.block_id === numericBlock.id);
  assertApprox(numericEntry.normalized_score, 70);
  const customEntry = summary.blocks.find((b) => b.block_id === customBlock.id);
  assertApprox(customEntry.normalized_score, 82);
  assertApprox(summary.overall_score, (70 + 82) / 2);
});

test("Empty session summary returns zero counts", async () => {
  const { admin, sessionId, blocks } = await bootstrapSession({
    blockConfigs: [{}, {}],
  });
  const { status, body } = await getSessionSummary(ORG_1, admin, sessionId);
  assert.equal(status, 200);
  const summary = body.item;
  assert.equal(summary.players_evaluated, 0);
  assert.equal(summary.blocks_evaluated, blocks.length);
  assert.deepEqual(summary.average_scores_by_block, []);
  assert.deepEqual(summary.top_players, []);
  assert.deepEqual(summary.lowest_players, []);
});

test("Cross-org access blocked for summaries", async () => {
  const { admin, sessionId, blocks, teamId } = await bootstrapSession({ blockConfigs: [{}] });
  const playerId = await createPlayer(ORG_1, admin, teamId);
  await submitScore(ORG_1, admin, sessionId, {
    player_id: playerId,
    block_id: blocks[0].id,
    score: { value: 3 },
  });

  const outsider = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const sessionSummary = await getSessionSummary(ORG_1, outsider, sessionId);
  assert.equal(sessionSummary.status, 403);
  const playerSummary = await getPlayerSummary(ORG_1, outsider, sessionId, playerId);
  assert.equal(playerSummary.status, 403);
});
