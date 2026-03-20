import { randomUUID } from "node:crypto";

import { seedTestOrgAndUsers, TEST_ORG_ID } from "./dbTestUtils.js";
import { query } from "../../src/db/client.js";

const RUN_ID = Date.now().toString(36);

export async function seedPaymentFixtures() {
  await seedTestOrgAndUsers();
  const seasonId = randomUUID();
  const guardianId = randomUUID();
  const playerId = randomUUID();
  const registrationId = randomUUID();
  const now = new Date();

  await query(
    `INSERT INTO seasons (id, org_id, label, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [seasonId, TEST_ORG_ID, `Payments Season ${RUN_ID}`, now]
  );

  await query(
    `INSERT INTO guardians (id, org_id, first_name, last_name, email, created_at, updated_at)
     VALUES ($1, $2, 'Pay', 'Guardian', $3, $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [guardianId, TEST_ORG_ID, `guardian-${RUN_ID}@example.com`, now]
  );

  await query(
    `INSERT INTO players (id, org_id, first_name, last_name, email, status, created_at, updated_at)
     VALUES ($1, $2, 'Pay', 'Player', $3, 'active', $4, $4)
     ON CONFLICT (id) DO NOTHING`,
    [playerId, TEST_ORG_ID, `player-${RUN_ID}@example.com`, now]
  );

  await query(
    `INSERT INTO registrations (id, org_id, season_id, player_id, guardian_id, status, submitted_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $6, $6)
     ON CONFLICT (id) DO NOTHING`,
    [registrationId, TEST_ORG_ID, seasonId, playerId, guardianId, now]
  );

  return { seasonId, guardianId, registrationId };
}

export async function ensureStripeAccount(stripeAccountId = "acct_test_123") {
  await query(
    `INSERT INTO payment_club_stripe_accounts (org_id, stripe_account_id, onboarding_complete)
     VALUES ($1, $2, true)
     ON CONFLICT (org_id) DO UPDATE SET stripe_account_id = excluded.stripe_account_id, onboarding_complete = true`,
    [TEST_ORG_ID, stripeAccountId]
  );
}
