import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hasDatabase, query } from "../src/db/client.js";

import {
  addPracticePlanBlockForOrg,
  createPracticePlanForOrg,
  deletePracticePlanBlockForOrg,
  deletePracticePlanForOrg,
  getPracticePlanForOrg,
  listPracticePlanBlocksForOrg,
  listPracticePlansForOrg,
  reorderPracticePlanBlocksForOrg,
  setPracticePlanStatusForOrg,
  updatePracticePlanBlockForOrg,
  updatePracticePlanForOrg,
} from "../src/services/practicePlansService.js";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEST_COACH_ID = randomUUID();

async function ensureOrgExists(orgId) {
  if (!hasDatabase()) return;
  await query(
    `INSERT INTO organizations (id, name, slug) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
    [orgId, `Practice Test Org ${orgId.slice(0, 8)}`, `practice-tests-${orgId.slice(0, 8)}`]
  );
}

async function ensureUserExists({ userId, orgId }) {
  if (!hasDatabase()) return;
  const emailSlug = userId.slice(0, 8);
  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO NOTHING`,
    [userId, `practice-coach-${emailSlug}`, `practice-coach-${emailSlug}@example.com`, "Practice Coach"]
  );
  if (orgId) {
    await query(
      `INSERT INTO memberships (user_id, org_id)
       VALUES ($1,$2)
       ON CONFLICT (user_id, org_id) DO NOTHING`,
      [userId, orgId]
    );
  }
}

async function makePlan(title = "Weeknight Session") {
  return await createPracticePlanForOrg({
    orgId: TEST_ORG_ID,
    userId: TEST_COACH_ID,
    payload: {
      title,
      durationMinutes: 90,
      focusAreas: ["passing"],
      notes: "Baseline plan",
    },
  });
}

test("practice plan service CRUD + block management (in-memory)", async () => {
  await ensureOrgExists(TEST_ORG_ID);
  await ensureUserExists({ userId: TEST_COACH_ID, orgId: TEST_ORG_ID });
  const plan = await makePlan();
  assert.ok(plan.id, "plan should have id");
  assert.equal(plan.status, "draft");

  const listed = await listPracticePlansForOrg({ orgId: TEST_ORG_ID, limit: 5, offset: 0 });
  assert.equal(listed.length, 1);

  const updatedPlan = await updatePracticePlanForOrg({
    orgId: TEST_ORG_ID,
    planId: plan.id,
    payload: {
      practiceDate: "2026-03-21",
      notes: "Updated plan",
    },
  });
  assert.equal(updatedPlan.notes, "Updated plan");
  const normalizedPracticeDate = new Date(updatedPlan.practice_date).toISOString().slice(0, 10);
  assert.equal(normalizedPracticeDate, "2026-03-21");

  const publishedPlan = await setPracticePlanStatusForOrg({
    orgId: TEST_ORG_ID,
    planId: plan.id,
    status: "published",
  });
  assert.equal(publishedPlan.status, "published");

  const blockA = await addPracticePlanBlockForOrg({
    orgId: TEST_ORG_ID,
    planId: plan.id,
    payload: {
      name: "Warmup",
      durationMinutes: 10,
      focusAreas: ["mobility"],
    },
  });
  const blockB = await addPracticePlanBlockForOrg({
    orgId: TEST_ORG_ID,
    planId: plan.id,
    payload: {
      name: "Shooting Ladder",
      durationMinutes: 20,
      playerGrouping: "whole",
    },
  });

  const blocks = await listPracticePlanBlocksForOrg({ orgId: TEST_ORG_ID, planId: plan.id });
  assert.equal(blocks.length, 2, "two blocks should exist");

  const updatedBlock = await updatePracticePlanBlockForOrg({
    orgId: TEST_ORG_ID,
    planId: plan.id,
    blockId: blockA.id,
    payload: { durationMinutes: 12, playerGrouping: "pods" },
  });
  assert.equal(updatedBlock.duration_minutes, 12);
  assert.equal(updatedBlock.player_grouping, "pods");

  const reordered = await reorderPracticePlanBlocksForOrg({
    orgId: TEST_ORG_ID,
    planId: plan.id,
    orderedIds: [blockB.id, blockA.id],
  });
  assert.equal(reordered[0].id, blockB.id, "reorder should move blockB to first position");

  await deletePracticePlanBlockForOrg({ orgId: TEST_ORG_ID, planId: plan.id, blockId: blockB.id });
  const remainingBlocks = await listPracticePlanBlocksForOrg({ orgId: TEST_ORG_ID, planId: plan.id });
  assert.equal(remainingBlocks.length, 1);

  await deletePracticePlanForOrg({ orgId: TEST_ORG_ID, planId: plan.id });
  const afterDelete = await getPracticePlanForOrg({ orgId: TEST_ORG_ID, planId: plan.id });
  assert.equal(afterDelete, null, "plan should be removed after delete");

  await assert.rejects(
    () =>
      setPracticePlanStatusForOrg({
        orgId: TEST_ORG_ID,
        planId: plan.id,
        status: "invalid-status",
      }),
    { code: "validation_error" }
  );
});
