-- EPIC 1 PR1: stable logo object pointer (do not store signed URLs)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_object_path TEXT;

-- Nice-to-have: ensure stored object pointers are in the expected prefix.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_logo_object_path_prefix'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_logo_object_path_prefix
      CHECK (logo_object_path IS NULL OR logo_object_path LIKE 'club-logos/%');
  END IF;
END $$;
