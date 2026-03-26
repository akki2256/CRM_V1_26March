-- Optional helper: drop legacy password_salt column from PostgreSQL users table.
-- Run only if column exists.

ALTER TABLE users DROP COLUMN IF EXISTS password_salt;
