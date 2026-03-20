import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/server.js";
import { createSeason } from "../src/repositories/seasonsRepo.js";
import { createPlayer } from "../src/repositories/playersRepo.js";
import { createGuardian } from "../src/repositories/guardiansRepo.js";
import { linkGuardianToPlayer } from "../src/repositories/guardianPlayersRepo.js";

const ORG_ID = "00000000-0000-0000-0000-000000000e01";
const SEASON_ACTIVE = "00000000-0000-0000-0000-00000000a111";
const SEASON_INACTIVE = "00000000-0000-0000-0000-00000000a222";
const GUARDIAN_ID = "00000000-0000-0000-0000-0000000000a1";
const ADMIN_USER_ID = "00000000-0000-0000-0000-00000000a999";
const GUARDIAN_USER_ID = "00000000-0000-0000-0000-0000000000b9";
const UNAUTHORIZED_USER_ID = "00000000-0000-0000-0000-00000000bbbb";

const RUN_ID = Date.now().toString(36);

let server;
let baseUrl;
let guardianId = GUARDIAN_ID;
let seasonActiveId = SEASON_ACTIVE;
let seasonInactiveId = SEASON_INACTIVE;
let playerSeq = 1;

async function seedDb() {
  if (process.env.DATABASE_URL) {
    const { query } = await import("../src/db/client.js");

    await query(
      `INSERT INTO organizations (id, name, slug)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name`,
      [ORG_ID, "Registration Test Org", `registration-test-${RUN_ID}`]
    );

    await query(
      `INSERT INTO seasons (id, org_id, label, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (id) DO UPDATE SET status = 'active'`,
      [SEASON_ACTIVE, ORG_ID, `Active Season ${RUN_ID}`]
    );

    await query(
      `INSERT INTO seasons (id, org_id, label, status)
       VALUES ($1, $2, $3, 'draft')
       ON CONFLICT (id) DO UPDATE SET status = 'draft'`,
      [SEASON_INACTIVE, ORG_ID, `Draft Season ${RUN_ID}`]
    );

    const now = new Date();

    await query(
      `INSERT INTO guardians (id, org_id, first_name, last_name, email, created_at, updated_at)
       VALUES ($1, $2, 'Guardian', 'Test', $3, $4, $4)
       ON CONFLICT (id) DO UPDATE SET org_id = excluded.org_id`,
      [GUARDIAN_ID, ORG_ID, `guardian-${RUN_ID}@example.com`, now]
    );

    const seededUsers = [
      { id: ADMIN_USER_ID, name: "Org Admin", email: `admin-${RUN_ID}@example.com` },
      { id: GUARDIAN_USER_ID, name: "Guardian User", email: `guardian-user-${RUN_ID}@example.com` },
      { id: UNAUTHORIZED_USER_ID, name: "Coach User", email: `coach-${RUN_ID}@example.com` },
    ];

    for (const { id, name, email } of seededUsers) {
      await query(
        `INSERT INTO users (id, external_uid, email, name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET email = excluded.email`,
        [id, email, email, name]
      );
    }

    guardianId = GUARDIAN_ID;
    return;
  }

  const guardian = await createGuardian({
    orgId: ORG_ID,
    firstName: "Guardian",
    lastName: "Test",
    email: `guardian-${RUN_ID}@example.com`,
  });
  guardianId = guardian.id;

  const activeSeason = await createSeason({
    orgId: ORG_ID,
    label: `Active Season ${RUN_ID}`,
    status: "active",
  });
  seasonActiveId = activeSeason.id;

  const inactiveSeason = await createSeason({
    orgId: ORG_ID,
    label: `Draft Season ${RUN_ID}`,
    status: "draft",
  });
  seasonInactiveId = inactiveSeason.id;
}

function makeUser({ id, permissions = [], roles = [], guardianId: gid = null }) {
  return {
    id,
    roles,
    permissions,
    activeOrgId: ORG_ID,
    orgScopes: [ORG_ID],
    guardianId: gid,
  };
}

function guardianActor(overrides = {}) {
  if (!guardianId) throw new Error("guardianId not seeded");
  return makeUser({
    id: GUARDIAN_USER_ID,
    roles: ["Guardian"],
    guardianId,
    permissions: [
      "registrations.page.view_own",
      "registrations.function.create",
      "registrations.function.withdraw",
    ],
    ...overrides,
  });
}

const adminUser = makeUser({
  id: ADMIN_USER_ID,
  roles: ["OrgAdmin"],
  permissions: [
    "registrations.page.view",
    "registrations.function.review",
  ],
});

const unauthorizedUser = makeUser({
  id: UNAUTHORIZED_USER_ID,
  roles: ["Coach"],
  permissions: [],
});

function headersFor(user) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(user),
  };
}

async function request(path, { method = "GET", body, user }) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headersFor(user),
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function createLinkedPlayerId() {
  const player = await createPlayer({
    orgId: ORG_ID,
    firstName: `Player${playerSeq}`,
    lastName: `Test${RUN_ID}`,
  });
  playerSeq += 1;
  await linkGuardianToPlayer({ orgId: ORG_ID, guardianId, playerId: player.id });
  return player.id;
}

async function createUnlinkedPlayerId() {
  const player = await createPlayer({
    orgId: ORG_ID,
    firstName: `Player${playerSeq}`,
    lastName: `Test${RUN_ID}`,
  });
  playerSeq += 1;
  return player.id;
}

async function guardianCreateRegistration({ playerId, seasonId = seasonActiveId }) {
  assert.ok(playerId, "playerId is required");
  const res = await request("/registrations", {
    method: "POST",
    user: guardianActor(),
    body: { playerId, seasonId },
  });
  return res;
}

async function expectStatus(res, expected, context = "") {
  if (res.status !== expected) {
    const detail = await res.text();
    const prefix = context ? `${context}: ` : "";
    assert.fail(`${prefix}expected status ${expected} but received ${res.status}: ${detail}`);
  }
}

function errorMessage(body) {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;
  if (body.error && typeof body.error.message === "string") return body.error.message;
  if (typeof body.code === "string") return body.code;
  return JSON.stringify(body);
}

test.before(async () => {
  await seedDb();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

// --- Tests ---

test("RBAC enforced on admin endpoints", async () => {
  const res = await request(`/registrations?seasonId=${seasonActiveId}`, { user: unauthorizedUser });
  assert.equal(res.status, 403);

  const detail = await request(`/registrations/${"does-not-exist"}`, { user: unauthorizedUser });
  assert.equal(detail.status, 403);
});

test("guardian can create/list/get registration", async () => {
  const playerId = await createLinkedPlayerId();
  const createRes = await guardianCreateRegistration({ playerId });
  await expectStatus(createRes, 201);
  const { registration } = await createRes.json();
  assert.ok(registration?.id, "registration id missing");
  assert.equal(registration.status, "pending");

  const listRes = await request(
    `/registrations?seasonId=${seasonActiveId}`,
    { user: adminUser }
  );
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.ok(listBody.items.find((item) => item.id === registration.id));

  const mineRes = await request("/registrations/mine", { user: guardianActor() });
  assert.equal(mineRes.status, 200);
  const mine = await mineRes.json();
  assert.ok(mine.items.find((item) => item.id === registration.id));

  const getRes = await request(`/registrations/${registration.id}`, { user: adminUser });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.registration.id, registration.id);
});

test("duplicate registration returns 409", async () => {
  const playerId = await createLinkedPlayerId();
  const first = await guardianCreateRegistration({ playerId });
  await expectStatus(first, 201);
  const duplicate = await guardianCreateRegistration({ playerId });
  assert.equal(duplicate.status, 409);
});

test("season must be active and guardian must be linked", async () => {
  const playerId = await createLinkedPlayerId();
  const inactive = await guardianCreateRegistration({ playerId, seasonId: seasonInactiveId });
  assert.equal(inactive.status, 400);
  const inactiveBody = await inactive.json();
  assert.match(errorMessage(inactiveBody), /active seasons/i);

  const unlinkedPlayerId = await createUnlinkedPlayerId();
  const notLinked = await guardianCreateRegistration({ playerId: unlinkedPlayerId });
  assert.equal(notLinked.status, 400);
  const notLinkedBody = await notLinked.json();
  assert.match(errorMessage(notLinkedBody), /guardian is not linked/i);
});

test("admin can update status and prevent withdraw once approved", async () => {
  const playerId = await createLinkedPlayerId();
  const createRes = await guardianCreateRegistration({ playerId });
  await expectStatus(createRes, 201);
  const { registration } = await createRes.json();

  const reviewRes = await request(`/registrations/${registration.id}/status`, {
    method: "PATCH",
    user: adminUser,
    body: { status: "approved", notes: "Auto-approval" },
  });
  await expectStatus(reviewRes, 200);
  const reviewed = await reviewRes.json();
  assert.equal(reviewed.registration.status, "approved");

  const withdraw = await request(`/registrations/${registration.id}`, {
    method: "DELETE",
    user: guardianActor(),
  });
  assert.equal(withdraw.status, 400);
});

test("guardian can withdraw pending registration", async () => {
  const playerId = await createLinkedPlayerId();
  const createRes = await guardianCreateRegistration({ playerId });
  await expectStatus(createRes, 201);
  const { registration } = await createRes.json();

  const withdraw = await request(`/registrations/${registration.id}`, {
    method: "DELETE",
    user: guardianActor(),
  });
  await expectStatus(withdraw, 200);
  const body = await withdraw.json();
  assert.equal(body.registration.status, "withdrawn");
});

test("waitlist promote cycles through queue", async () => {
  const firstPlayerId = await createLinkedPlayerId();
  const secondPlayerId = await createLinkedPlayerId();

  const first = await guardianCreateRegistration({ playerId: firstPlayerId });
  await expectStatus(first, 201);
  const firstId = (await first.json()).registration.id;
  const second = await guardianCreateRegistration({ playerId: secondPlayerId });
  await expectStatus(second, 201);
  const secondId = (await second.json()).registration.id;

  await request(`/registrations/${firstId}/status`, {
    method: "PATCH",
    user: adminUser,
    body: { status: "waitlisted" },
  });
  await request(`/registrations/${secondId}/status`, {
    method: "PATCH",
    user: adminUser,
    body: { status: "waitlisted" },
  });

  const promoteFirst = await request(`/registrations/${seasonActiveId}/waitlist/promote`, {
    method: "POST",
    user: adminUser,
  });
  await expectStatus(promoteFirst, 200);
  const promoted = await promoteFirst.json();
  assert.equal(promoted.registration.id, firstId);
  assert.equal(promoted.registration.status, "pending");

  const promoteSecond = await request(`/registrations/${seasonActiveId}/waitlist/promote`, {
    method: "POST",
    user: adminUser,
  });
  await expectStatus(promoteSecond, 200);
  const promotedSecond = await promoteSecond.json();
  assert.equal(promotedSecond.registration.id, secondId);

  const promoteEmpty = await request(`/registrations/${seasonActiveId}/waitlist/promote`, {
    method: "POST",
    user: adminUser,
  });
  assert.equal(promoteEmpty.status, 404);
});

test("guardian endpoints prevent non-guardian access", async () => {
  const mineRes = await request("/registrations/mine", { user: unauthorizedUser });
  assert.equal(mineRes.status, 403);

  const withdrawRes = await request(`/registrations/${"some-id"}`, {
    method: "DELETE",
    user: unauthorizedUser,
  });
  assert.equal(withdrawRes.status, 403);
});
