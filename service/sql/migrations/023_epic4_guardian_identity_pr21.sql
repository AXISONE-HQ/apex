-- 023_epic4_guardian_identity_pr21.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'guardians_org_email_unique'
  ) THEN
    EXECUTE '
      CREATE UNIQUE INDEX guardians_org_email_unique
      ON guardians (org_id, lower(email))
      WHERE email IS NOT NULL
    ';
  END IF;
END $$;
