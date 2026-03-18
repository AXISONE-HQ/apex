import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const USER_ORGADMIN = "00000000-0000-0000-0000-000000000101";

let server;
let baseUrl;

const RUN_ID = Date.now().toString(36);
let planCounter = 1;
let blockCounter = 1;

function xUser({ id, roles, orgScopes, teamScopes = [] }) {
  return { id, roles, permissions: [], orgScopes, teamScopes };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

function makePlanPayload(overrides = {}) {
  return {
    name: `Plan ${RUN_ID}-${planCounter++}`,
    sport: "soccer",
    age_group: "U15",
    gender: "mixed",
    evaluation_category: "skill",
    scope: "club",
    ...overrides,
  };
}

function makeBlockPayload(overrides = {}) {
  return {
    name: `Block ${RUN_ID}-${blockCounter++}`,
    sport: "soccer",
    evaluation_type: "skill",
    scoring_method: "numeric_scale",
    scoring_config: { min: 1, max: 5 },
    instructions: "Do the drill",
    objective: "Improve",
    difficulty: "medium",
    ...overrides,
  };
}

async function createPlan(orgId, user, overrides = {}) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-plans`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makePlanPayload(overrides)),
  });
  assert.equal(res.status, 201, `plan create failed: ${res.status}`);
  return (await res.json()).item;
}

async function createBlock(orgId, user, overrides = {}) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify(makeBlockPayload(overrides)),
  });
  assert.equal(res.status, 201, `block create failed: ${res.status}`);
  return (await res.json()).item;
}

async function addBlockToPlan({ orgId, planId, blockId, user }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks`, {
    method: "POST",
    headers: headersFor(user),
    body: JSON.stringify({ block_id: blockId }),
  });
  assert.equal(res.status, 201, `add block failed: ${res.status}`);
  return (await res.json()).item;
}

async function listBlocks({ orgId, planId, user }) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/evaluation-plans/${planId}/blocks`, {
    headers: headersFor(user),
  });
  assert.equal(res.status, 200, `list blocks failed: ${res.status}`);
  return (await res.json()).items;
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

test("OrgAdmin can add block to plan", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin);
  const block = await createBlock(ORG_1, admin);

  const added = await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: block.id, user: admin });
  assert.equal(added.plan_id, plan.id);
  assert.equal(added.block_id, block.id);
  assert.equal(added.position, 1);
});

test("List blocks preserves order", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin);
  const blockA = await createBlock(ORG_1, admin, { name: "Block A" });
  const blockB = await createBlock(ORG_1, admin, { name: "Block B" });
  await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockA.id, user: admin });
  await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockB.id, user: admin });

  const items = await listBlocks({ orgId: ORG_1, planId: plan.id, user: admin });
  assert.equal(items.length, 2);
  assert.equal(items[0].block_id, blockA.id);
  assert.equal(items[1].block_id, blockB.id);
});

test("Removing a block renormalizes positions", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin);
  const blockA = await createBlock(ORG_1, admin);
  const blockB = await createBlock(ORG_1, admin);
  const addedA = await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockA.id, user: admin });
  await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockB.id, user: admin });

  const delRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${plan.id}/blocks/${addedA.id}`, {
    method: "DELETE",
    headers: headersFor(admin),
  });
  assert.equal(delRes.status, 204);

  const items = await listBlocks({ orgId: ORG_1, planId: plan.id, user: admin });
  assert.equal(items.length, 1);
  assert.equal(items[0].position, 1);
  assert.equal(items[0].block_id, blockB.id);
});

test("Duplicating a block inserts after source", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin);
  const block = await createBlock(ORG_1, admin);
  const added = await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: block.id, user: admin });

  const dupRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${plan.id}/blocks/${added.id}/duplicate`, {
    method: "POST",
    headers: headersFor(admin),
  });
  assert.equal(dupRes.status, 201);
  const dupBody = await dupRes.json();
  assert.equal(dupBody.item.block_id, block.id);

  const items = await listBlocks({ orgId: ORG_1, planId: plan.id, user: admin });
  assert.equal(items.length, 2);
  assert.equal(items[0].block_id, block.id);
  assert.equal(items[1].block_id, block.id);
  assert.equal(items[0].position, 1);
  assert.equal(items[1].position, 2);
});

test("Reorder updates positions", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin);
  const blockA = await createBlock(ORG_1, admin);
  const blockB = await createBlock(ORG_1, admin);
  const a = await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockA.id, user: admin });
  const b = await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockB.id, user: admin });

  const reorderRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${plan.id}/reorder`, {
    method: "PATCH",
    headers: headersFor(admin),
    body: JSON.stringify({ ordered_block_ids: [b.id, a.id] }),
  });
  assert.equal(reorderRes.status, 200);
  const body = await reorderRes.json();
  assert.equal(body.items[0].id, b.id);
  assert.equal(body.items[0].position, 1);
  assert.equal(body.items[1].id, a.id);
  assert.equal(body.items[1].position, 2);
});

test("Duplicate block_id allowed", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin);
  const block = await createBlock(ORG_1, admin);

  await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: block.id, user: admin });
  await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: block.id, user: admin });

  const items = await listBlocks({ orgId: ORG_1, planId: plan.id, user: admin });
  assert.equal(items.length, 2);
  assert.equal(items[0].block_id, block.id);
  assert.equal(items[1].block_id, block.id);
});

test("Invalid reorder payload rejected", async () => {
  const admin = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const plan = await createPlan(ORG_1, admin);
  const blockA = await createBlock(ORG_1, admin);
  const blockB = await createBlock(ORG_1, admin);
  const a = await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockA.id, user: admin });
  await addBlockToPlan({ orgId: ORG_1, planId: plan.id, blockId: blockB.id, user: admin });

  const reorderRes = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${plan.id}/reorder`, {
    method: "PATCH",
    headers: headersFor(admin),
    body: JSON.stringify({ ordered_block_ids: [a.id] }),
  });
  assert.equal(reorderRes.status, 400);
});

test("Cross-org access blocked", async () => {
  const adminOrg1 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_1] });
  const adminOrg2 = xUser({ id: USER_ORGADMIN, roles: ["OrgAdmin"], orgScopes: [ORG_2] });
  const plan = await createPlan(ORG_1, adminOrg1);
  const block = await createBlock(ORG_1, adminOrg1);

  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/evaluation-plans/${plan.id}/blocks`, {
    method: "POST",
    headers: headersFor(adminOrg2),
    body: JSON.stringify({ block_id: block.id }),
  });
  assert.equal(res.status, 403);
});
