import test from "node:test";
import assert from "node:assert/strict";
import { uniqueName } from "./helpers/nameUtils.js";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

const ORG_1 = "00000000-0000-0000-0000-000000003301";
const ORG_2 = "00000000-0000-0000-0000-000000003302";
const USER_ORGADMIN_1 = "00000000-0000-0000-0000-00000000f001";
const USER_ORGADMIN_2 = "00000000-0000-0000-0000-00000000f002";
const USER_PLATFORM = "00000000-0000-0000-0000-000000009987";

function xUser({ id, roles = [], orgScopes = [], isPlatformAdmin = false }) {
  return { id, roles, orgScopes, isPlatformAdmin };
}

function orgAdminHeaders(orgId, userId = USER_ORGADMIN_1) {
  return {
    "content-type": "application/json",
    "x-user": JSON.stringify(xUser({ id: userId, roles: ["OrgAdmin"], orgScopes: [orgId] })),
  };
}

const platformHeaders = {
  "content-type": "application/json",
  "x-user": JSON.stringify(xUser({ id: USER_PLATFORM, isPlatformAdmin: true })),
};

let server;
let baseUrl;
let playerCounter = 1;
let guardianCounter = 1;

async function seedDb() {
  if (!process.env.DATABASE_URL) return;
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Guardian RSVP Org One", "guardian-rsvp-org-one"]
  );

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Guardian RSVP Org Two", "guardian-rsvp-org-two"]
  );

  const users = [
    [USER_PLATFORM, "platform-admin-8", "platform8@example.com", "Platform Admin 8"],
    [USER_ORGADMIN_1, "guardian-rsvp-org-admin-1", "rsvp-orgadmin1@example.com", "Org Admin One"],
    [USER_ORGADMIN_2, "guardian-rsvp-org-admin-2", "rsvp-orgadmin2@example.com", "Org Admin Two"],
  ];

  for (const [id, ext, email, name] of users) {
    await query(
      `INSERT INTO users (id, external_uid, email, name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [id, ext, email, name]
    );
  }
}

async function createTeam(orgId, namePrefix = "RSVP Team") {
  const payload = {
    name: uniqueName(namePrefix),
    season_year: 2026,
    season_label: "2026 Outdoor",
    sport: "soccer",
    team_level: "club",
    competition_level: "club",
    age_category: "U18",
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/teams`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create team for org ${orgId}`);
  return (await res.json()).item;
}

async function createPlayer(orgId, teamId = null, firstName = "Player") {
  const payload = {
    first_name: firstName,
    last_name: `#${playerCounter++}`,
  };
  if (teamId) payload.team_id = teamId;
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create player for org ${orgId}`);
  return (await res.json()).item;
}

async function setPlayerStatus(orgId, playerId, status) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}`, {
    method: "PATCH",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify({ status }),
  });
  assert.equal(res.status, 200);
}

async function createGuardian(orgId, lastName = "Guardian") {
  const payload = {
    first_name: "Test",
    last_name: lastName,
    email: `guardian-rsvp-${guardianCounter++}@example.com`,
  };
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/guardians`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create guardian for org ${orgId}`);
  return (await res.json()).guardian;
}

async function linkGuardian(orgId, playerId, guardianId, headers = orgAdminHeaders(orgId)) {
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/players/${playerId}/guardians`, {
    method: "POST",
    headers,
    body: JSON.stringify({ guardian_id: guardianId }),
  });
  assert.equal(res.status, 200);
}

async function createEvent(orgId, teamId, overrides = {}) {
  const payload = {
    team_id: teamId,
    type: overrides.type || "practice",
    title: overrides.title || "Practice",
    starts_at: overrides.starts_at || new Date().toISOString(),
    ends_at: overrides.ends_at || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    location: overrides.location || "Field",
  };
  if (payload.type === "game") {
    payload.opponent_name = overrides.opponent_name || "Opp FC";
    payload.location_type = overrides.location_type || "home";
    payload.game_type = overrides.game_type || "league";
  }
  const res = await fetch(`${baseUrl}/admin/clubs/${orgId}/events`, {
    method: "POST",
    headers: orgAdminHeaders(orgId),
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 201, `failed to create event for org ${orgId}`);
  return (await res.json()).event;
}

async function postGuardianRsvp({ orgId, guardianId, eventId, body, headers = orgAdminHeaders(orgId) }) {
  const res = await fetch(
    `${baseUrl}/admin/clubs/${orgId}/guardians/${guardianId}/events/${eventId}/rsvp`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }
  );
  return { status: res.status, body: await res.json() };
}

async function getGuardianRsvps({ orgId, guardianId, eventId, headers = orgAdminHeaders(orgId) }) {
  const res = await fetch(
    `${baseUrl}/admin/clubs/${orgId}/guardians/${guardianId}/events/${eventId}/rsvp`,
    {
      method: "GET",
      headers,
    }
  );
  return { status: res.status, body: await res.json() };
}

test.before(async () => {
  if (process.env.DATABASE_URL) await seedDb();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server?.close) await new Promise((resolve) => server.close(resolve));
});

test("Guardian can RSVP yes with trimmed notes", async () => {
  const team = await createTeam(ORG_1);
  const player = await createPlayer(ORG_1, team.id, "RSVPChild");
  const guardian = await createGuardian(ORG_1, "FamilyYes");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const event = await createEvent(ORG_1, team.id, { title: "Rsvp Practice" });

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "yes", notes: "  coming soon  " },
  });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.attendance.status, "present");
  assert.equal(body.attendance.rsvp_status, "yes");
  assert.equal(body.attendance.notes, "coming soon");
});

test("Guardian can RSVP late and read back statuses", async () => {
  const team = await createTeam(ORG_1, "Late Team");
  const guardian = await createGuardian(ORG_1, "FamilyLate");
  const playerA = await createPlayer(ORG_1, team.id, "Alpha");
  const playerB = await createPlayer(ORG_1, team.id, "Beta");
  await linkGuardian(ORG_1, playerA.id, guardian.id);
  await linkGuardian(ORG_1, playerB.id, guardian.id);
  const event = await createEvent(ORG_1, team.id, { title: "Dual Practice" });

  const write = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: playerA.id, status: "late" },
  });
  assert.equal(write.status, 200);
  assert.equal(write.body.attendance.status, "late");

  const read = await getGuardianRsvps({ orgId: ORG_1, guardianId: guardian.id, eventId: event.id });
  assert.equal(read.status, 200);
  assert.equal(read.body.rsvps.length, 2);
  const alpha = read.body.rsvps.find((r) => r.player.id === playerA.id);
  const beta = read.body.rsvps.find((r) => r.player.id === playerB.id);
  assert.equal(alpha.attendance.status, "late");
  assert.equal(alpha.attendance.rsvp_status, "late");
  assert.equal(beta.attendance.status, null);
  assert.equal(beta.attendance.rsvp_status, null);
});

test("Stored present/absent values accepted", async () => {
  const team = await createTeam(ORG_1, "Stored Team");
  const guardian = await createGuardian(ORG_1, "StoredFamily");
  const player = await createPlayer(ORG_1, team.id, "StoredChild");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "present" },
  });
  assert.equal(status, 200);
  assert.equal(body.attendance.rsvp_status, "yes");

  const absent = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "absent" },
  });
  assert.equal(absent.status, 200);
  assert.equal(absent.body.attendance.rsvp_status, "no");
});

test("Unknown field rejected", async () => {
  const team = await createTeam(ORG_1, "Reject Team");
  const guardian = await createGuardian(ORG_1, "RejectFamily");
  const player = await createPlayer(ORG_1, team.id, "RejectChild");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "yes", extra: true },
  });
  assert.equal(status, 400);
  assert.match(body.message, /unknown field/i);
});

test("Invalid status rejected", async () => {
  const team = await createTeam(ORG_1, "Invalid Status");
  const guardian = await createGuardian(ORG_1, "InvalidStatus");
  const player = await createPlayer(ORG_1, team.id, "InvalidChild");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "maybe" },
  });
  assert.equal(status, 400);
  assert.match(body.message, /status must be one of/i);
});

test("Player not linked to guardian rejected", async () => {
  const team = await createTeam(ORG_1, "Unlinked Team");
  const guardian = await createGuardian(ORG_1, "UnlinkedFamily");
  const player = await createPlayer(ORG_1, team.id, "UnlinkedChild");
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "yes" },
  });
  assert.equal(status, 400);
  assert.match(body.message, /not eligible/i);
});

test("Inactive linked player rejected", async () => {
  const team = await createTeam(ORG_1, "Inactive RSVP");
  const guardian = await createGuardian(ORG_1, "InactiveGuardian");
  const player = await createPlayer(ORG_1, team.id, "InactiveChild");
  await setPlayerStatus(ORG_1, player.id, "inactive");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "yes" },
  });
  assert.equal(status, 400);
  assert.match(body.message, /not eligible/i);
});

test("Guardian cannot RSVP for player on different team", async () => {
  const teamA = await createTeam(ORG_1, "Team A");
  const teamB = await createTeam(ORG_1, "Team B");
  const guardian = await createGuardian(ORG_1, "CrossTeam");
  const player = await createPlayer(ORG_1, teamA.id, "CrossChild");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const event = await createEvent(ORG_1, teamB.id);

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: player.id, status: "yes" },
  });
  assert.equal(status, 400);
  assert.match(body.message, /not eligible/i);
});

test("Cross-org guardian request returns guardian_not_found", async () => {
  const team = await createTeam(ORG_1, "CrossOrg Team");
  const guardian = await createGuardian(ORG_1, "CrossOrg Guardian");
  const player = await createPlayer(ORG_1, team.id, "CrossOrg Child");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await postGuardianRsvp({
    orgId: ORG_2,
    guardianId: guardian.id,
    eventId: event.id,
    headers: orgAdminHeaders(ORG_2, USER_ORGADMIN_2),
    body: { player_id: player.id, status: "yes" },
  });
  assert.equal(status, 404);
  assert.equal(body.error, "guardian_not_found");
});

test("Event not found returns 404", async () => {
  const guardian = await createGuardian(ORG_1, "MissingEvent");
  const { status, body } = await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: "00000000-0000-0000-0000-ffffffffffff",
    body: { player_id: "00000000-0000-0000-0000-ffffffffffff", status: "yes" },
  });
  assert.equal(status, 404);
  assert.equal(body.error, "event_not_found");
});

test("Read endpoint returns empty list when guardian has no eligible players", async () => {
  const guardian = await createGuardian(ORG_1, "NoEligible");
  const player = await createPlayer(ORG_1, null, "FreeAgent");
  await linkGuardian(ORG_1, player.id, guardian.id);
  const team = await createTeam(ORG_1, "Eligible Team");
  const event = await createEvent(ORG_1, team.id);

  const { status, body } = await getGuardianRsvps({ orgId: ORG_1, guardianId: guardian.id, eventId: event.id });
  assert.equal(status, 200);
  assert.deepEqual(body.rsvps, []);
});

test("Guardian read endpoint hides other players", async () => {
  const team = await createTeam(ORG_1, "Read Team");
  const guardian = await createGuardian(ORG_1, "ReadFamily");
  const linkedPlayer = await createPlayer(ORG_1, team.id, "Linked");
  const otherPlayer = await createPlayer(ORG_1, team.id, "Other");
  await linkGuardian(ORG_1, linkedPlayer.id, guardian.id);
  const event = await createEvent(ORG_1, team.id);

  await postGuardianRsvp({
    orgId: ORG_1,
    guardianId: guardian.id,
    eventId: event.id,
    body: { player_id: linkedPlayer.id, status: "no", notes: "can't make it" },
  });

  const { status, body } = await getGuardianRsvps({ orgId: ORG_1, guardianId: guardian.id, eventId: event.id });
  assert.equal(status, 200);
  assert.equal(body.rsvps.length, 1);
  assert.equal(body.rsvps[0].player.id, linkedPlayer.id);
  assert.equal(body.rsvps[0].attendance.status, "absent");
  assert.equal(body.rsvps[0].attendance.rsvp_status, "no");
  assert.equal(body.rsvps[0].attendance.notes, "can't make it");
  assert(!body.rsvps.find((r) => r.player.id === otherPlayer.id));
});
