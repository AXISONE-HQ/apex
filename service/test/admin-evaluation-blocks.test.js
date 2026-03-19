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

const BLOCK_RUN = Date.now().toString(36);
let blockCounter = 1;

function makeBlockPayload(overrides = {}) {
  return {
    name: `Ball Handling ${BLOCK_RUN}-${blockCounter++}`,
    sport: "basketball",
    evaluation_type: "skill",
    scoring_method: "numeric_scale",
    scoring_config: { min: 1, max: 10 },
    instructions: "Dribble full court with both hands",
    objective: "Assess ball control",
    difficulty: "medium",
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

async function ensureTeam(orgUser) {
  if (teamIdForOrg1) return teamIdForOrg1;
  const payload = {
    name: `Team ${BLOCK_RUN}-${Date.now()}`,
    season_year: 2026,
    season_label: "2026 Outdoor",
    sport: "soccer",
    team_level: "club",
    competition_level: "club",
    age_category: "U15",
  };

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/teams`, {
    method: "POST",
    headers: headersFor(orgUser),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `team create failed: ${res.status}`);
  const body = await res.json();
  teamIdForOrg1 = body.item.id;
  return teamIdForOrg1;
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

test("OrgAdmin can create evaluation block", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makeBlockPayload()),
  });

  assert.equal(res.status, 201, `unexpected status ${res.status}`);
  const body = await res.json();
  assert.ok(body.item);
  assert.equal(body.item.org_id, ORG_1);
  assert.equal(body.item.created_by_type, "club");
  assert.equal(body.item.scoring_method, "numeric_scale");
});

test("Coach can create team-scoped block", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const teamId = await ensureTeam(adminUser);

  const coachUser = xUser({
    id: USER_COACH,
    roles: ["Coach"],
    orgScopes: [ORG_1],
    teamScopes: [teamId],
  });

  const payload = makeBlockPayload({
    name: `Team Drill ${BLOCK_RUN}`,
    team_id: teamId,
    scoring_method: "rating_scale",
    scoring_config: { options: ["poor", "average", "good", "excellent"] },
  });

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(coachUser),
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201, `unexpected status ${res.status}`);
  const body = await res.json();
  assert.equal(body.item.team_id, teamId);
  assert.equal(body.item.created_by_type, "coach");
  assert.equal(body.item.scoring_method, "rating_scale");
  assert.deepEqual(body.item.scoring_config.options, ["poor", "average", "good", "excellent"]);
});

test("List endpoint returns blocks", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    headers: headersFor(user),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items));
  assert.equal(body.items.length >= 2, true);
});

test("PATCH updates scoring method and difficulty", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const createRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makeBlockPayload()),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  const blockId = createBody.item.id;

  const patchRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks/${blockId}`, {
    method: "PATCH",
    headers: headersFor(user),
    body: JSON.stringify({
      difficulty: "easy",
      scoring_method: "custom_metric",
      scoring_config: { unit: "seconds", value_label: "time" },
    }),
  });

  assert.equal(patchRes.status, 200, `patch failed: ${patchRes.status}`);
  const patchBody = await patchRes.json();
  assert.equal(patchBody.item.difficulty, "easy");
  assert.equal(patchBody.item.scoring_method, "custom_metric");
  assert.equal(patchBody.item.scoring_config.unit, "seconds");
});

test("PATCH rejects unknown fields", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const createRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makeBlockPayload()),
  });
  assert.equal(createRes.status, 201);
  const blockId = (await createRes.json()).item.id;

  const patchRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks/${blockId}`, {
    method: "PATCH",
    headers: headersFor(user),
    body: JSON.stringify({ evil: true }),
  });

  assert.equal(patchRes.status, 400);
  const body = await patchRes.json();
  assert.equal(body.error, "bad_request");
});

test("Create rejects invalid scoring config", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const payload = makeBlockPayload({ scoring_config: { min: 5 } });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "bad_request");
});

test("Coach cannot create block in unauthorized org", async () => {
  const coachUser = xUser({ id: USER_COACH, roles: ["Coach"], orgScopes: [ORG_1] });
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(coachUser),
    body: JSON.stringify(makeBlockPayload()),
  });

  assert.equal(res.status, 403);
});

test("team_id must belong to org", async () => {
  const adminMultiOrg = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1, ORG_2] });
  const adminOrg1 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1, ORG_2] });
  const teamId = await ensureTeam(adminOrg1);

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(adminMultiOrg),
    body: JSON.stringify(makeBlockPayload({ team_id: teamId })),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "team_not_found");
});

test("Create block with categories", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const categories = ["tactical", "technical"];
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makeBlockPayload({ categories })),
  });
  assert.equal(res.status, 201, `unexpected status ${res.status}`);
  const body = await res.json();
  const expected = [...categories].sort();
  assert.deepEqual(body.item.categories, expected);
});

test("PATCH can update categories", async () => {
  const user = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const createRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makeBlockPayload({ categories: ["technical"] })),
  });
  assert.equal(createRes.status, 201);
  const blockId = (await createRes.json()).item.id;

  const patchRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks/${blockId}`, {
    method: "PATCH",
    headers: headersFor(user),
    body: JSON.stringify({ categories: ["physical", "mental"] }),
  });
  assert.equal(patchRes.status, 200);
  const patchBody = await patchRes.json();
  const sorted = [...patchBody.item.categories].sort();
  assert.deepEqual(sorted, ["mental", "physical"].sort());
});

test("List filters by category, difficulty, sport, and creator", async () => {
  const adminUser = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const coachUser = xUser({ id: USER_COACH, roles: ["Coach"], orgScopes: [ORG_1], teamScopes: [await ensureTeam(adminUser)] });

  const createClubRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(adminUser),
    body: JSON.stringify(
      makeBlockPayload({
        name: `Club Block ${BLOCK_RUN}`,
        sport: "basketball",
        difficulty: "easy",
        categories: ["technical", "mental"],
      })
    ),
  });
  assert.equal(createClubRes.status, 201);
  const clubBlock = (await createClubRes.json()).item;

  const coachPayload = makeBlockPayload({
    name: `Coach Block ${BLOCK_RUN}`,
    sport: "soccer",
    difficulty: "hard",
    categories: ["physical"],
    scoring_method: "rating_scale",
    scoring_config: { options: ["poor", "average", "good"] },
    team_id: await ensureTeam(adminUser),
  });
  const createCoachRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(coachUser),
    body: JSON.stringify(coachPayload),
  });
  assert.equal(createCoachRes.status, 201);
  const coachBlock = (await createCoachRes.json()).item;

  const userHeaders = headersFor(adminUser);

  const byCategory = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks?category=technical`, { headers: userHeaders });
  assert.equal(byCategory.status, 200);
  const byCategoryBody = await byCategory.json();
  assert.equal(byCategoryBody.items.length >= 1, true);
  assert.equal(byCategoryBody.items.some((b) => b.id === clubBlock.id), true);
  assert.equal(byCategoryBody.items.some((b) => b.id === coachBlock.id), false);

  const byDifficulty = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks?difficulty=hard`, { headers: userHeaders });
  assert.equal(byDifficulty.status, 200);
  const hardItems = await byDifficulty.json();
  assert.equal(hardItems.items.every((b) => b.difficulty === "hard"), true);
  assert.equal(hardItems.items.some((b) => b.id === coachBlock.id), true);

  const bySport = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks?sport=soccer`, { headers: userHeaders });
  const bySportBody = await bySport.json();
  assert.equal(bySport.status, 200);
  assert.equal(bySportBody.items.every((b) => b.sport === "soccer"), true);
  assert.equal(bySportBody.items.some((b) => b.id === coachBlock.id), true);

  const byCreator = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks?creator=coach`, { headers: userHeaders });
  const byCreatorBody = await byCreator.json();
  assert.equal(byCreator.status, 200);
  assert.equal(byCreatorBody.items.every((b) => b.created_by_type === "coach"), true);
  assert.equal(byCreatorBody.items.some((b) => b.id === coachBlock.id), true);
});

test("Search respects filters and org boundaries", async () => {
  const adminOrg1 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const adminOrg2 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const uniqueTerm = `Focus ${BLOCK_RUN}-${Date.now()}`;

  const createTechnical = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(adminOrg1),
    body: JSON.stringify(
      makeBlockPayload({
        name: `Technical ${uniqueTerm}`,
        categories: ["technical"],
      })
    ),
  });
  assert.equal(createTechnical.status, 201);
  const technicalBlock = (await createTechnical.json()).item;

  const createPhysical = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(adminOrg1),
    body: JSON.stringify(
      makeBlockPayload({
        name: `Physical ${uniqueTerm}`,
        categories: ["physical"],
      })
    ),
  });
  assert.equal(createPhysical.status, 201);
  const physicalBlock = (await createPhysical.json()).item;

  const createOtherOrg = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(adminOrg2),
    body: JSON.stringify(
      makeBlockPayload({
        name: `Other Org ${uniqueTerm}`,
        categories: ["technical"],
      })
    ),
  });
  assert.equal(createOtherOrg.status, 201);

  const encodedTerm = encodeURIComponent(uniqueTerm);
  const searchRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks?search=${encodedTerm}`, {
    headers: headersFor(adminOrg1),
  });
  assert.equal(searchRes.status, 200);
  const searchBody = await searchRes.json();
  assert.equal(searchBody.items.some((b) => b.id === technicalBlock.id), true);
  assert.equal(searchBody.items.some((b) => b.id === physicalBlock.id), true);
  assert.equal(searchBody.items.some((b) => b.org_id === ORG_2), false);

  const searchWithCategory = await fetch(
    `${baseUrl}/admin/clubs/${ORG_1}/evaluation-blocks?search=${encodedTerm}&category=technical`,
    { headers: headersFor(adminOrg1) }
  );
  assert.equal(searchWithCategory.status, 200);
  const searchWithCategoryBody = await searchWithCategory.json();
  assert.equal(searchWithCategoryBody.items.some((b) => b.id === technicalBlock.id), true);
  assert.equal(searchWithCategoryBody.items.some((b) => b.id === physicalBlock.id), false);
});
