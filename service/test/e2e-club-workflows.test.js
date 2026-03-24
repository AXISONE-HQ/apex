import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { DB_ENABLED, TEST_ORG_ID, TEST_USER_UUIDS, seedTestOrgAndUsers } from "./helpers/dbTestUtils.js";
import { createPlayer } from "../src/repositories/playersRepo.js";
import { createGuardian } from "../src/repositories/guardiansRepo.js";
import { linkGuardianToPlayer } from "../src/repositories/guardianPlayersRepo.js";

const RUN_ID = Date.now().toString(36);
let server;
let baseUrl;

function adminUser() {
  return {
    id: TEST_USER_UUIDS.u1,
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    roles: ["OrgAdmin"],
    permissions: [
      "seasons.function.create",
      "seasons.page.view",
      "registrations.page.view",
      "registrations.function.review",
    ],
  };
}

function guardianUser(guardianId) {
  return {
    id: TEST_USER_UUIDS.u2,
    activeOrgId: TEST_ORG_ID,
    orgScopes: [TEST_ORG_ID],
    guardianId,
    roles: ["Guardian"],
    permissions: [
      "registrations.page.view_own",
      "registrations.function.create",
      "registrations.function.withdraw",
    ],
  };
}

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

async function request(path, { method = "GET", user, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headersFor(user),
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function ensureServer() {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
}

test.before(async () => {
  await seedTestOrgAndUsers();
  await ensureServer();
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

async function bootstrapGuardianPlayer() {
  const guardian = await createGuardian({
    orgId: TEST_ORG_ID,
    firstName: "E2E",
    lastName: `Guardian-${RUN_ID}`,
    email: `guardian-${RUN_ID}@example.com`,
  });
  const player = await createPlayer({
    orgId: TEST_ORG_ID,
    firstName: "E2E",
    lastName: `Player-${RUN_ID}`,
  });
  await linkGuardianToPlayer({ orgId: TEST_ORG_ID, guardianId: guardian.id, playerId: player.id });
  return { guardianId: guardian.id, playerId: player.id };
}

test("season creation + guardian registration approval", async (t) => {
  if (!DB_ENABLED) {
    t.skip("DATABASE_URL not configured for DB-backed e2e test");
    return;
  }

  const admin = adminUser();
  const seasonPayload = {
    label: `E2E Season ${RUN_ID}`,
    year: 2027,
    starts_on: "2027-09-05",
  };
  const createSeasonRes = await request(`/admin/clubs/${TEST_ORG_ID}/seasons`, {
    method: "POST",
    user: admin,
    body: seasonPayload,
  });
  assert.equal(createSeasonRes.status, 201, `season create failed: ${createSeasonRes.status}`);
  const createdSeason = await createSeasonRes.json();
  assert.ok(createdSeason?.item?.id, "season id missing");

  const { guardianId, playerId } = await bootstrapGuardianPlayer();
  const guardian = guardianUser(guardianId);

  const createRegistrationRes = await request(`/registrations`, {
    method: "POST",
    user: guardian,
    body: { playerId, seasonId: createdSeason.item.id },
  });
  assert.equal(createRegistrationRes.status, 201, `registration create failed (${createRegistrationRes.status})`);
  const { registration } = await createRegistrationRes.json();
  assert.equal(registration.status, "pending");

  const approveRes = await request(`/registrations/${registration.id}/status`, {
    method: "PATCH",
    user: admin,
    body: { status: "approved", notes: "E2E happy path" },
  });
  assert.equal(approveRes.status, 200, `status update failed (${approveRes.status})`);
  const approvedBody = await approveRes.json();
  assert.equal(approvedBody.registration.status, "approved");

  const guardianList = await request(`/registrations/mine`, { user: guardian });
  assert.equal(guardianList.status, 200, "guardian listing failed");
  const mine = await guardianList.json();
  assert.ok(mine.items.find((item) => item.id === registration.id));
});

// Upcoming scenarios stitched together in the same e2e harness

test.todo("payments checkout + invoice reconciliation across the seeded registration");
test.todo("AI practice plan generation, save, load, and export round-trip");
test.todo("tryout creation, scoring, and roster generation pipeline");
test.todo("dashboard rollups reflect season + payment + tryout signals");
