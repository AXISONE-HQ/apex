-- 017_epic2_guardians.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'guardians'
  ) THEN
    CREATE TABLE guardians (
      id UUID PRIMARY KEY,
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      display_name TEXT,
      email TEXT,
      phone TEXT,
      relationship TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

      CONSTRAINT guardians_status_check
        CHECK (status IN ('active', 'inactive')),

      CONSTRAINT guardians_first_name_length_check
        CHECK (char_length(first_name) BETWEEN 1 AND 120),

      CONSTRAINT guardians_last_name_length_check
        CHECK (char_length(last_name) BETWEEN 1 AND 120),

      CONSTRAINT guardians_display_name_length_check
        CHECK (display_name IS NULL OR char_length(display_name) <= 120),

      CONSTRAINT guardians_email_length_check
        CHECK (email IS NULL OR char_length(email) <= 255),

      CONSTRAINT guardians_phone_length_check
        CHECK (phone IS NULL OR char_length(phone) <= 50),

      CONSTRAINT guardians_relationship_length_check
        CHECK (relationship IS NULL OR char_length(relationship) <= 80),

      CONSTRAINT guardians_notes_length_check
        CHECK (notes IS NULL OR char_length(notes) <= 500)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS guardians_org_id_idx ON guardians (org_id);
CREATE INDEX IF NOT EXISTS guardians_org_name_idx ON guardians (org_id, last_name, first_name, created_at);
CREATE INDEX IF NOT EXISTS guardians_org_status_idx ON guardians (org_id, status);
