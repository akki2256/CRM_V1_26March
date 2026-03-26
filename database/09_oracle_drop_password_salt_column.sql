-- Optional helper: drop legacy PASSWORD_SALT column from Oracle USERS table.
-- Run only if column exists.

ALTER TABLE "users" DROP COLUMN password_salt;
