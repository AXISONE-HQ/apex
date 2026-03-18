import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const USER_ORGADMIN = "00000000-0000-0000-0000-000000000101";
const USER_COACH = "00000000-0000-0000-0000-000000000201";

let server;
let baseUrl;
let teamIdForOrg1;
let teamIdForOrg2;

const PLAN_RUN = Date.now().toString(36);
let planCounter = 1;

function makePlanPayload(overrides = {}) {
  return {
    name: `Training Plan ${PLAN_RUN}-${planCounter++}`,
    sport: "basketball",
    age_group: "U15",
    gender: "female",
    evaluation_category: "skill",
    scope: "club",
    ...overrides,
  };
}

function xUser({ id, roles, orgScopes, teamScopes = [] }) {
  return { id, roles, permissions: [], orgScopes, teamScopes };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

async function ensureTeam(orgId) {
  if (orgId === ORG_1 && teamIdForOrg1) return teamIdForOrg1;
  if (orgId === ORG_2 && teamIdForOrg2) return teamIdForOrg2;

  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [orgId] });
  const payload = {
    name: `Team ${PLAN_RUN}-${Date.now()}-${orgId}`,
    season_year: 2026,
    season_label: "2026 Outdoor",
    sport: "soccer",
    team_level: "club",
    competition_level: "club",
    age_category: "U15",
  };

  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams`, {
    method: "POST",
    headers: headersFor(adminUser),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `team create failed for ${orgId}: ${res.status}`);
  const body = await res.json();
  if (orgId === ORG_1) {
    teamIdForOrg1 = body.item.id;
    return teamIdForOrg1;
  }
  teamIdForOrg2 = body.item.id;
  return teamIdForOrg2;
}

async function createPlan(orgId, user, overrides = {}) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makePlanPayload(overrides)),
  });
  assert.equal(res.status, 201, `plan create failed: ${res.status}`);
  return await res.json();
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

test("OrgAdmin can create club plan", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makePlanPayload()),
  });
  assert.equal(res.status, 201, `unexpected status ${res.status}`);
  const body = await res.json();
  assert.equal(body.item.org_id, ORG_1);
  assert.equal(body.item.scope, "club");
  assert.equal(body.item.team_id, null);
});

test("OrgAdmin can create team plan", async () => {
  const teamId = await ensureTeam(ORG_1);
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const payload = makePlanPayload({ scope: "team", team_id: teamId, evaluation_category: "physical" });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.item.scope, "team");
  assert.equal(body.item.team_id, teamId);
  assert.equal(body.item.evaluation_category, "physical");
});

test("Invalid scope/team combinations are rejected", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });

  const teamScopeMissingTeam = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makePlanPayload({ scope: "team", team_id: null })),
  });
  assert.equal(teamScopeMissingTeam.status, 400);
  const missingBody = await teamScopeMissingTeam.json();
  assert.equal(missingBody.error, "invalid_scope_team");

  const clubScopeWithTeam = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makePlanPayload({ scope: "club", team_id: "team_123" })),
  });
  assert.equal(clubScopeWithTeam.status, 400);
  const clubBody = await clubScopeWithTeam.json();
  assert.equal(clubBody.error, "invalid_scope_team");
});

test("List plans returns org-scoped entries", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  await createPlan(ORG_1, adminUser);
  await createPlan(ORG_1, adminUser, { scope: "club", evaluation_category: "tryout" });

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    headers: headersFor(adminUser),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items));
  assert.equal(body.items.length >= 2, true);
  assert.equal(body.items.every((plan) => plan.org_id === ORG_1), true);
});

test("List filters support sport/category/scope/team", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1);

  const clubPlan = await createPlan(ORG_1, adminUser, {
    sport: "basketball",
    scope: "club",
    evaluation_category: "skill",
  });

  const teamPlan = await createPlan(ORG_1, adminUser, {
    sport: "soccer",
    scope: "team",
    team_id: teamId,
    evaluation_category: "physical",
  });

  const sportRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans?sport=soccer`, {
    headers: headersFor(adminUser),
  });
  assert.equal(sportRes.status, 200);
  const sportBody = await sportRes.json();
  assert.equal(sportBody.items.every((plan) => plan.sport === "soccer"), true);
  assert.equal(sportBody.items.some((plan) => plan.id === teamPlan.item.id), true);
  assert.equal(sportBody.items.some((plan) => plan.id === clubPlan.item.id), false);

  const categoryRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans?evaluation_category=physical`, {
    headers: headersFor(adminUser),
  });
  assert.equal(categoryRes.status, 200);
  const categoryBody = await categoryRes.json();
  assert.equal(categoryBody.items.every((plan) => plan.evaluation_category === "physical"), true);

  const scopeRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans?scope=club`, {
    headers: headersFor(adminUser),
  });
  assert.equal(scopeRes.status, 200);
  const scopeBody = await scopeRes.json();
  assert.equal(scopeBody.items.every((plan) => plan.scope === "club"), true);

  const teamRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans?team_id=${teamId}`, {
    headers: headersFor(adminUser),
  });
  assert.equal(teamRes.status, 200);
  const teamBody = await teamRes.json();
  assert.equal(teamBody.items.every((plan) => plan.team_id === teamId), true);
});

test("Get plan returns plan details", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, adminUser);
  const planId = plan.item.id;

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${planId}`, {
    headers: headersFor(adminUser),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.item.id, planId);
});

test("PATCH updates plan scope and category", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const created = await createPlan(ORG_1, adminUser);
  const planId = created.item.id;
  const teamId = await ensureTeam(ORG_1);

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${planId}`, {
    method: "PATCH",
    headers: headersFor(adminUser),
    body: JSON.stringify({
      scope: "team",
      team_id: teamId,
      evaluation_category: "season_review",
      sport: "hockey",
    }),
  });
  assert.equal(res.status, 200, `patch failed: ${res.status}`);
  const body = await res.json();
  assert.equal(body.item.scope, "team");
  assert.equal(body.item.team_id, teamId);
  assert.equal(body.item.evaluation_category, "season_review");
  assert.equal(body.item.sport, "hockey");
});

test("PATCH switching to club clears team_id", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1);
  const created = await createPlan(ORG_1, adminUser, { scope: "team", team_id: teamId });
  const planId = created.item.id;

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${planId}`, {
    method: "PATCH",
    headers: headersFor(adminUser),
    body: JSON.stringify({ scope: "club" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.item.scope, "club");
  assert.equal(body.item.team_id, null);
});

test("PATCHing unrelated fields keeps scope/team", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(ORG_1);
  const created = await createPlan(ORG_1, adminUser, { scope: "team", team_id: teamId });
  const planId = created.item.id;

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${planId}`, {
    method: "PATCH",
    headers: headersFor(adminUser),
    body: JSON.stringify({ name: "Updated Name" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.item.scope, "team");
  assert.equal(body.item.team_id, teamId);
  assert.equal(body.item.name, "Updated Name");
});

test("Team must belong to org", async () => {
  const teamIdOrg1 = await ensureTeam(ORG_1);
  const adminOrg2 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const payload = makePlanPayload({ scope: "team", team_id: teamIdOrg1 });

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(adminOrg2),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "team_not_found");
});

test("Cross-org access blocked", async () => {
  const adminOrg1 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  await createPlan(ORG_1, adminOrg1);

  const adminOrg2 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    headers: headersFor(adminOrg2),
  });
  assert.equal(res.status, 403);
});

test("Coach can manage plans within org", async () => {
  const teamId = await ensureTeam(ORG_1);
  const coachUser = xUser({
    id: USER_COACH,
    roles: ["Coach"],
    orgScopes: [ORG_1],
    teamScopes: [teamId],
  });

  const payload = makePlanPayload({ scope: "team", team_id: teamId, evaluation_category: "tryout" });
  const createRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(coachUser),
    body: JSON.stringify(payload),
  });
  assert.equal(createRes.status, 201);
  const plan = await createRes.json();

  const listRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans`, {
    headers: headersFor(coachUser),
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.equal(listBody.items.some((p) => p.id === plan.item.id), true);
});
