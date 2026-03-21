import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  createPracticeDrillForOrg,
  deletePracticeDrillForOrg,
  getPracticeDrillForOrg,
  listPracticeDrillsForOrg,
  updatePracticeDrillForOrg,
} from "../src/services/practiceDrillsService.js";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEST_COACH_ID = randomUUID();

test("practice drill service CRUD + validation (in-memory)", async () => {
  const basePayload = {
    name: "Rapid Fire",
    category: "shooting",
    focusAreas: ["accuracy"],
    defaultDurationMinutes: 15,
    description: "Quick release shooting drill",
  };

  const created = await createPracticeDrillForOrg({
    orgId: TEST_ORG_ID,
    userId: TEST_COACH_ID,
    payload: basePayload,
  });

  assert.ok(created.id, "drill should get an id");
  assert.equal(created.name, "Rapid Fire");
  assert.deepEqual(created.focus_areas, ["accuracy"]);

  const listed = await listPracticeDrillsForOrg({ orgId: TEST_ORG_ID, limit: 10, offset: 0 });
  assert.equal(listed.length, 1, "drill should appear in listing");

  const updated = await updatePracticeDrillForOrg({
    orgId: TEST_ORG_ID,
    drillId: created.id,
    payload: {
      name: "Rapid Fire v2",
      focusAreas: ["accuracy", "speed"],
      defaultDurationMinutes: 20,
      equipment: "cones",
    },
  });
  assert.equal(updated.name, "Rapid Fire v2");
  assert.equal(updated.default_duration_minutes, 20);
  assert.deepEqual(updated.focus_areas, ["accuracy", "speed"]);
  assert.equal(updated.equipment, "cones");

  const fetched = await getPracticeDrillForOrg({ orgId: TEST_ORG_ID, drillId: created.id });
  assert.equal(fetched?.name, "Rapid Fire v2");

  const deleted = await deletePracticeDrillForOrg({ orgId: TEST_ORG_ID, drillId: created.id });
  assert.equal(deleted, true);

  const afterDelete = await getPracticeDrillForOrg({ orgId: TEST_ORG_ID, drillId: created.id });
  assert.equal(afterDelete, null, "drill should no longer exist once deleted");

  await assert.rejects(
    () =>
      createPracticeDrillForOrg({
        orgId: TEST_ORG_ID,
        payload: { category: "passing" },
      }),
    { code: "validation_error" }
  );
});
