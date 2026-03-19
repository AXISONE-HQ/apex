import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV ||= "test";
process.env.INVITE_TOKEN_PEPPER ||= "test-pepper";

const { default: app } = await import("../src/server.js");

let server;
let baseUrl;

const ORG_1 = "00000000-0000-0000-0000-000000000001";
const ORG_2 = "00000000-0000-0000-0000-000000000002";
const ORG_3 = "00000000-0000-0000-0000-000000000003";

const USER_ORGADMIN_1 = "00000000-0000-0000-0000-000000000101";
const USER_PLATFORM = "00000000-0000-0000-0000-000000000901";

function xUser({ id, roles = [], permissions = [], orgScopes = [], isPlatformAdmin = false }) {
  return { id, roles, permissions, orgScopes, isPlatformAdmin };
}

async function seedDb() {
  const { query } = await import("../src/db/client.js");

  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_1, "Org One", "org-one"]
  );
  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_2, "Org Two", "org-two"]
  );
  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [ORG_3, "Org Three", "org-three"]
  );

  // Users are optional for x-user header auth, but keep them present for completeness.
  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [USER_ORGADMIN_1, "ext-admin-1", "admin1@example.com", "Admin 1"]
  );
  await query(
    `INSERT INTO users (id, external_uid, email, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [USER_PLATFORM, "ext-platform-1", "platform@example.com", "Platform Admin"]
  );
}

test.before(async () => {
  if (process.env.DATABASE_URL) {
    await seedDb();
  }

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (!server?.close) return;
  await new Promise((resolve) => server.close(resolve));
});

test("Smoke: server responds to /healthz", async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.equal(res.status, 200);
});

test("OrgAdmin scoped to org can GET settings (200) and returns {} when unset", { timeout: 10000 }, async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    headers: {
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.item.org_id, ORG_1);
  assert.deepEqual(body.item.settings, {});
});

test("OrgAdmin scoped to org can PATCH settings (200)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({
      age_categories: ["U10", "U12"],
      default_training_duration_min: 90,
    }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.item.settings.age_categories, ["U10", "U12"]);
  assert.equal(body.item.settings.default_training_duration_min, 90);
});

test("OrgAdmin scoped to other org cannot PATCH (403)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({ age_categories: ["U14"] }),
  });

  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error, "forbidden");
});

test("Platform admin can GET/PATCH any org (200)", async () => {
  const patch = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(xUser({ id: USER_PLATFORM, isPlatformAdmin: true })),
    },
    body: JSON.stringify({ competition_levels: ["A", "AA"] }),
  });

  assert.equal(patch.status, 200);

  const get = await fetch(`${baseUrl}/admin/clubs/${ORG_2}/settings`, {
    headers: {
      "x-user": JSON.stringify(xUser({ id: USER_PLATFORM, isPlatformAdmin: true })),
    },
  });

  assert.equal(get.status, 200);
  const body = await get.json();
  assert.deepEqual(body.item.settings.competition_levels, ["A", "AA"]);
});

test("PATCH merges top-level keys; nested objects are replaced (no deep merge)", async () => {
  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
    ),
  };

  const res1 = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({
      communication_policies: { allow_dm: true, parent_chat: true, player_chat: true },
    }),
  });
  assert.equal(res1.status, 200);

  const res2 = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({
      communication_policies: { allow_dm: false },
    }),
  });
  assert.equal(res2.status, 200);

  const get = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, { headers: { "x-user": h["x-user"] } });
  assert.equal(get.status, 200);
  const body = await get.json();

  assert.deepEqual(body.item.settings.communication_policies, {
    allow_dm: false,
    parent_chat: false,
    player_chat: false,
  });
});

test("Validation: unknown top-level key rejected (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({ evil: true }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "bad_request");
});

test("Validation: top-level null rejected (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({ season: null }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "bad_request");
});

test("Validation: season start_date must be < end_date (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({ season: { start_date: "2026-09-01", end_date: "2026-09-01" } }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, "bad_request");
  assert.equal(body.message, "invalid_season");
});

test("Validation: default_training_duration_min out of range (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({ default_training_duration_min: 5 }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "invalid_default_training_duration_min");
});

test("Validation: duplicate age_categories (case-insensitive) rejected (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({ age_categories: ["U14", "u14"] }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "invalid_age_categories");
});

test("Validation: duplicate competition_levels (case-insensitive) rejected (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({ competition_levels: ["AA", "aa"] }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "invalid_competition_levels");
});

test("Validation: duplicate template id rejected (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({
      evaluation_templates: [
        {
          id: "default",
          name: "Default",
          criteria: [{ key: "effort", label: "Effort", weight: 1 }],
        },
        {
          id: "default",
          name: "Default 2",
          criteria: [{ key: "skill", label: "Skill", weight: 1 }],
        },
      ],
    }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "invalid_evaluation_templates");
});

test("Validation: duplicate criterion key within template rejected (400)", async () => {
  const res = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-user": JSON.stringify(
        xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
      ),
    },
    body: JSON.stringify({
      evaluation_templates: [
        {
          id: "default",
          name: "Default",
          criteria: [
            { key: "effort", label: "Effort", weight: 1 },
            { key: "effort", label: "Effort again", weight: 1 },
          ],
        },
      ],
    }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.message, "invalid_evaluation_templates");
});

test("Validation: communication_policies invalid key/value rejected (400)", async () => {
  const h = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_1] })
    ),
  };

  const res1 = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ communication_policies: { evil: true } }),
  });
  assert.equal(res1.status, 400);

  const res2 = await fetch(`${baseUrl}/admin/clubs/${ORG_1}/settings`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ communication_policies: { allow_dm: "yes" } }),
  });
  assert.equal(res2.status, 400);
});

test("Validation: merged settings payload > 64KB rejected (400)", async () => {
  // Use a fresh org to avoid state bleed from earlier tests.
  const headers = {
    "content-type": "application/json",
    "x-user": JSON.stringify(
      xUser({ id: USER_ORGADMIN_1, roles: ["OrgAdmin"], orgScopes: [ORG_3] })
    ),
  };

  // PATCH 1: large but under typical body-parser limit; should succeed.
  const evaluation_templates = Array.from({ length: 10 }, (_t, ti) => {
    const criteria = Array.from({ length: 45 }, (_c, ci) => ({
      key: `k_${ci}`,
      label: `Criterion ${ci} ${"x".repeat(95)}`.slice(0, 110),
      weight: 1,
    }));

    return {
      id: `t_${ti}`,
      name: `Template ${ti}`,
      criteria,
    };
  });

  const res1 = await fetch(`${baseUrl}/admin/clubs/${ORG_3}/settings`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ evaluation_templates }),
  });

  // If this ever flips to 400, reduce template/criteria/label size.
  assert.equal(res1.status, 200);

  // PATCH 2: add another large-but-valid key so the *merged* stored settings exceeds 64KB.
  // Keep item size constraints: <=32 chars each, <=50 items, unique case-insensitive.
  const competition_levels = Array.from({ length: 50 }, (_v, i) => `L${String(i).padStart(2, "0")}-${"x".repeat(28)}`.slice(0, 32));

  const res2 = await fetch(`${baseUrl}/admin/clubs/${ORG_3}/settings`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ competition_levels }),
  });

  assert.equal(res2.status, 400);
  const body2 = await res2.json();
  assert.equal(body2.error, "bad_request");
  assert.equal(body2.message, "settings_payload_too_large");
});
