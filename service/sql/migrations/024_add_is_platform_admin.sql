-- 024_add_is_platform_admin.sql

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;
