-- =============================================================================
-- Oracle: four application users (one per CRM group: Admin, Agent, Lead, Manager)
-- =============================================================================
-- Run after: 01_create_tables_oracle.sql, 02_seed_groups_oracle.sql
--
-- Sign-in (user_name / password):
--   seed_admin     / admin@123
--   seed_agent     / agent@123
--   seed_lead      / lead@123
--   seed_manager   / manager@123
--
-- password_hash = BCrypt (strength 10), same encoder as Spring Boot app.
-- Regenerate:  cd backend
--              .\mvnw.cmd -q compile exec:java "-Dexec.args=admin@123"
--              (main class: com.crm.tools.PasswordHashGenerator)
--
-- Display names (first_name || ' ' || last_name) used by contact owner columns:
--   Seed Administrator | Seed Agent | Seed Lead | Seed Manager
--
-- Re-runnable: deletes these four users (and their group rows) then re-inserts.
-- =============================================================================

SET DEFINE OFF;

DELETE FROM USER_GROUPS
WHERE user_id IN (
    SELECT user_id FROM USERS
    WHERE user_name IN ('seed_admin', 'seed_agent', 'seed_lead', 'seed_manager')
);

DELETE FROM USERS
WHERE user_name IN ('seed_admin', 'seed_agent', 'seed_lead', 'seed_manager');

INSERT INTO USERS (
    user_name,
    first_name,
    last_name,
    password_hash,
    email,
    phone_number,
    login_attempts,
    user_status,
    temporary_password_hash,
    temporary_password_expires_at,
    must_change_password,
    created_by,
    created_date,
    last_updated_by,
    last_updated_date,
    oca_control
) VALUES (
    'seed_admin',
    'Seed',
    'Administrator',
    '$2a$10$me.T4G4q18.83MXA/z0iau0PCcpRiV0mX1gRynY4ymC7pB6TO1pbS',
    'seed.admin@example.com',
    NULL,
    0,
    'ACTIVE',
    NULL,
    NULL,
    0,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    0
);

INSERT INTO USERS (
    user_name,
    first_name,
    last_name,
    password_hash,
    email,
    phone_number,
    login_attempts,
    user_status,
    temporary_password_hash,
    temporary_password_expires_at,
    must_change_password,
    created_by,
    created_date,
    last_updated_by,
    last_updated_date,
    oca_control
) VALUES (
    'seed_agent',
    'Seed',
    'Agent',
    '$2a$10$cem0hIBN5CWrEj6vAfTF/uQEkneyOukEYZMqYjj0OeRuV7i0HqMXW',
    'seed.agent@example.com',
    NULL,
    0,
    'ACTIVE',
    NULL,
    NULL,
    0,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    0
);

INSERT INTO USERS (
    user_name,
    first_name,
    last_name,
    password_hash,
    email,
    phone_number,
    login_attempts,
    user_status,
    temporary_password_hash,
    temporary_password_expires_at,
    must_change_password,
    created_by,
    created_date,
    last_updated_by,
    last_updated_date,
    oca_control
) VALUES (
    'seed_lead',
    'Seed',
    'Lead',
    '$2a$10$cUK8Qrczb/FRuzNXEjv.GuK8aYXM8VTmzaX2s2XB8Yz3JXsglfX9i',
    'seed.lead@example.com',
    NULL,
    0,
    'ACTIVE',
    NULL,
    NULL,
    0,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    0
);

INSERT INTO USERS (
    user_name,
    first_name,
    last_name,
    password_hash,
    email,
    phone_number,
    login_attempts,
    user_status,
    temporary_password_hash,
    temporary_password_expires_at,
    must_change_password,
    created_by,
    created_date,
    last_updated_by,
    last_updated_date,
    oca_control
) VALUES (
    'seed_manager',
    'Seed',
    'Manager',
    '$2a$10$DTFXPJWcg2QsjMGu9tFC1.OivGocsKQ8A5Jw3qCQ6KgLzshBh9/6.',
    'seed.manager@example.com',
    NULL,
    0,
    'ACTIVE',
    NULL,
    NULL,
    0,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    'SEED_SCRIPT',
    CURRENT_TIMESTAMP,
    0
);

INSERT INTO USER_GROUPS (
    user_id, group_id, created_by, created_date, last_updated_by, last_updated_date, oca_control
)
SELECT u.user_id, g.group_id, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 0
FROM USERS u
INNER JOIN GROUPS g ON g.group_name = 'Admin'
WHERE u.user_name = 'seed_admin';

INSERT INTO USER_GROUPS (
    user_id, group_id, created_by, created_date, last_updated_by, last_updated_date, oca_control
)
SELECT u.user_id, g.group_id, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 0
FROM USERS u
INNER JOIN GROUPS g ON g.group_name = 'Agent'
WHERE u.user_name = 'seed_agent';

INSERT INTO USER_GROUPS (
    user_id, group_id, created_by, created_date, last_updated_by, last_updated_date, oca_control
)
SELECT u.user_id, g.group_id, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 0
FROM USERS u
INNER JOIN GROUPS g ON g.group_name = 'Lead'
WHERE u.user_name = 'seed_lead';

INSERT INTO USER_GROUPS (
    user_id, group_id, created_by, created_date, last_updated_by, last_updated_date, oca_control
)
SELECT u.user_id, g.group_id, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 'SEED_SCRIPT', CURRENT_TIMESTAMP, 0
FROM USERS u
INNER JOIN GROUPS g ON g.group_name = 'Manager'
WHERE u.user_name = 'seed_manager';

COMMIT;
