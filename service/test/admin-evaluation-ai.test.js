import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import {
  setEvaluationAISuggestionProvider,
  resetEvaluationAISuggestionProvider,
} from "../src/services/evaluationAIService.js";

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const USER_ORGADMIN = "00000000-0000-0000-0000-000000000101";
const USER_COACH = "00000000-0000-0000-0000-000000000201";

let server;
let baseUrl;

function xUser({ id, roles, orgScopes, teamScopes = [] }) {
  return { id, roles, permissions: [], orgScopes, teamScopes };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

function setTestProvider(fn) {
  setEvaluationAISuggestionProvider(fn);
}

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  resetEvaluationAISuggestionProvider();
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

test.afterEach(() => {
  resetEvaluationAISuggestionProvider();
});

test("Valid generation returns normalized suggestions", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  setTestProvider(async () => [
    {
      name: "  Press Drill  ",
      categories: ["Technical", "Mental", "Unknown"],
      instructions: "  Apply high press   ",
      scoring_method: "Numeric",
      scoring_config: { min: "1", max: "5" },
      objective: "Force turnovers",
      difficulty: "HARD",
    },
  ]);

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(admin),
    body: JSON.stringify({
      sport: "Soccer",
      evaluation_category: "skill",
      complexity: "medium",
    }),
  });
  assert.equal(res.status, 200, `unexpected status ${res.status}`);
  const body = await res.json();
  assert.ok(Array.isArray(body.suggestions));
  assert.equal(body.suggestions.length, 1);
  const suggestion = body.suggestions[0];
  assert.deepEqual(suggestion.categories, ["technical", "mental"]);
  assert.equal(suggestion.scoring_method, "numeric_scale");
  assert.equal(suggestion.scoring_config.min, 1);
  assert.equal(suggestion.scoring_config.max, 5);
  assert.equal(suggestion.difficulty, "hard");
  assert.equal(suggestion.instructions, "Apply high press");
});

test("Invalid complexity rejected", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(admin),
    body: JSON.stringify({
      sport: "soccer",
      evaluation_category: "skill",
      complexity: "extreme",
    }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "bad_request");
});

test("Unknown fields rejected", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(admin),
    body: JSON.stringify({
      sport: "soccer",
      evaluation_category: "skill",
      complexity: "easy",
      foo: "bar",
    }),
  });
  assert.equal(res.status, 400);
});

test("Malformed provider suggestion filtered out", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  setTestProvider(async () => [
    {
      name: "Valid Block",
      categories: ["physical"],
      instructions: "Push ups",
      scoring_method: "rating",
      scoring_config: { options: ["poor", "good", "great"] },
    },
    {
      name: "Missing instructions",
      categories: ["technical"],
      scoring_method: "numeric",
      scoring_config: { min: 0, max: 10 },
    },
  ]);

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(admin),
    body: JSON.stringify({
      sport: "soccer",
      evaluation_category: "skill",
      complexity: "medium",
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.suggestions.length, 1);
  assert.equal(body.suggestions[0].name, "Valid Block");
});

test("No valid suggestions returns 400", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  setTestProvider(async () => [
    { name: "", categories: [], instructions: "" },
  ]);
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(admin),
    body: JSON.stringify({ sport: "soccer", evaluation_category: "skill", complexity: "easy" }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "no valid suggestions generated");
});

test("No persistence side effects", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  setTestProvider(async () => [
    {
      name: "Block",
      categories: ["technical"],
      instructions: "Do thing",
      scoring_method: "numeric",
      scoring_config: { min: 1, max: 3 },
    },
  ]);

  const blocksBeforeRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    headers: headersFor(admin),
  });
  const blocksBefore = (await blocksBeforeRes.json()).items.length;

  const plansBeforeRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    headers: headersFor(admin),
  });
  const plansBefore = (await plansBeforeRes.json()).items.length;

  const aiRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(admin),
    body: JSON.stringify({ sport: "soccer", evaluation_category: "skill", complexity: "medium" }),
  });
  assert.equal(aiRes.status, 200);

  const blocksAfter = (await (await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    headers: headersFor(admin),
  })).json()).items.length;
  const plansAfter = (await (await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    headers: headersFor(admin),
  })).json()).items.length;

  assert.equal(blocksAfter, blocksBefore);
  assert.equal(plansAfter, plansBefore);
});

test("Coach can request suggestions", async () => {
  const coach = xUser({ id: USER_COACH, roles: ["Coach"], orgScopes: [ORG_1], teamScopes: [] });
  setTestProvider(async () => [
    {
      name: "Block",
      categories: ["technical"],
      instructions: "Do thing",
      scoring_method: "numeric",
      scoring_config: { min: 1, max: 3 },
    },
  ]);

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(coach),
    body: JSON.stringify({ sport: "soccer", evaluation_category: "skill", complexity: "easy" }),
  });
  assert.equal(res.status, 200);
});

test("Cross-org access blocked", async () => {
  const adminOrg2 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-ai/generate`, {
    method: "POST",
    headers: headersFor(adminOrg2),
    body: JSON.stringify({ sport: "soccer", evaluation_category: "skill", complexity: "easy" }),
  });
  assert.equal(res.status, 403);
});
