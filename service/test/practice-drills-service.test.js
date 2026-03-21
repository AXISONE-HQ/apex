import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hasDatabase, query } from "../src/db/client.js";

import {
  createPracticeDrillForOrg,
  deletePracticeDrillForOrg,
  getPracticeDrillForOrg,
  listPracticeDrillsForOrg,
  updatePracticeDrillForOrg,
} from "../src/services/practiceDrillsService.js";


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

test("practice drill service CRUD + validation (in-memory)", async () => {
  await ensureOrgExists(TEST_ORG_ID);
  await ensureUserExists({ userId: TEST_COACH_ID, orgId: TEST_ORG_ID });
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
