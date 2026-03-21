import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

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

const TEST_ORG_ID = randomUUID();
const TEST_COACH_ID = randomUUID();

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
  assert.equal(updatedPlan.practice_date, "2026-03-21");

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
