-- Payments & Financial Management (Drop 1)
-- Fee templates, invoices, and Stripe Connect scaffolding

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_fee_type') THEN
    CREATE TYPE payment_fee_type AS ENUM ('registration', 'team', 'custom');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_invoice_status') THEN
    CREATE TYPE payment_invoice_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'waived');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS payment_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'cad',
  fee_type payment_fee_type NOT NULL DEFAULT 'registration',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, season_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_fees_org_season_name_lower
  ON payment_fees(org_id, season_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_payment_fees_org_season
  ON payment_fees(org_id, season_id);

CREATE INDEX IF NOT EXISTS idx_payment_fees_org_type
  ON payment_fees(org_id, fee_type);

CREATE TABLE IF NOT EXISTS payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES payment_fees(id) ON DELETE CASCADE,
  guardian_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'cad',
  status payment_invoice_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, registration_id, fee_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_org_status
  ON payment_invoices(org_id, status);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_registration
  ON payment_invoices(registration_id);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_guardian
  ON payment_invoices(guardian_user_id);

CREATE TABLE IF NOT EXISTS payment_club_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row level security scaffolding (scoped by org + guardian ownership when context is provided)
ALTER TABLE payment_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_club_stripe_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'payment_fees_org_policy'
  ) THEN
    CREATE POLICY payment_fees_org_policy ON payment_fees
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      )
      WITH CHECK (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'payment_invoices_org_policy'
  ) THEN
    CREATE POLICY payment_invoices_org_policy ON payment_invoices
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      )
      WITH CHECK (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'payment_invoices_guardian_read'
  ) THEN
    CREATE POLICY payment_invoices_guardian_read ON payment_invoices
      FOR SELECT
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR (
          org_id::text = current_setting('app.current_org_id', true)
          AND (
            current_setting('app.current_guardian_user_id', true) IS NULL
            OR guardian_user_id::text = current_setting('app.current_guardian_user_id', true)
          )
        )
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'payment_club_stripe_accounts_org_policy'
  ) THEN
    CREATE POLICY payment_club_stripe_accounts_org_policy ON payment_club_stripe_accounts
      USING (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      )
      WITH CHECK (
        current_setting('app.current_org_id', true) IS NULL
        OR org_id::text = current_setting('app.current_org_id', true)
      );
  END IF;
END$$;
