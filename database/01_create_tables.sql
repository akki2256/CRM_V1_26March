-- CRM login schema (PostgreSQL-compatible).
-- For Oracle 21c, use 01_create_tables_oracle.sql and 02_seed_groups_oracle.sql instead.
-- Audit fields: created_by, created_date, last_updated_by, last_updated_date, oca_control (optimistic concurrency)

CREATE TABLE IF NOT EXISTS "groups" (
    group_id          BIGSERIAL PRIMARY KEY,
    group_name        VARCHAR(100) NOT NULL UNIQUE,
    created_by        VARCHAR(100) NOT NULL,
    created_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_by   VARCHAR(100) NOT NULL,
    last_updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    oca_control       BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
    user_id                      BIGSERIAL PRIMARY KEY,
    user_name                    VARCHAR(100) NOT NULL UNIQUE,
    first_name                   VARCHAR(100) NOT NULL,
    last_name                    VARCHAR(100) NOT NULL,
    password_hash                VARCHAR(255) NOT NULL,
    email                        VARCHAR(255) NOT NULL UNIQUE,
    phone_number                 VARCHAR(50),
    login_attempts               INT NOT NULL DEFAULT 0,
    user_status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    temporary_password_hash      VARCHAR(255),
    temporary_password_expires_at TIMESTAMPTZ,
    must_change_password         BOOLEAN NOT NULL DEFAULT FALSE,
    created_by                   VARCHAR(100) NOT NULL,
    created_date                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_by              VARCHAR(100) NOT NULL,
    last_updated_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    oca_control                  BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_groups (
    user_id           BIGINT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    group_id          BIGINT NOT NULL REFERENCES "groups" (group_id) ON DELETE CASCADE,
    created_by        VARCHAR(100) NOT NULL,
    created_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_by   VARCHAR(100) NOT NULL,
    last_updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    oca_control       BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_user_name ON users (user_name);
