-- Optional: create a demo admin user (password: ChangeMe!1)
-- Password hash below is BCrypt for "ChangeMe!1" — generate a new hash for production.
-- Run 01_create_tables.sql and 02_seed_groups.sql first.

-- Uncomment and adjust after groups exist:
/*
INSERT INTO users (
    user_name, first_name, last_name, password_hash, email, phone_number,
    login_attempts, user_status, created_by, created_date, last_updated_by, last_updated_date, oca_control
) VALUES (
    'admin',
    'System',
    'Administrator',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin@example.com',
    NULL,
    0,
    'ACTIVE',
    'SYSTEM',
    NOW(),
    'SYSTEM',
    NOW(),
    0
);

INSERT INTO user_groups (user_id, group_id, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT u.user_id, g.group_id, 'SYSTEM', NOW(), 'SYSTEM', NOW(), 0
FROM users u
CROSS JOIN "groups" g
WHERE u.user_name = 'admin' AND g.group_name = 'Admin'
ON CONFLICT DO NOTHING;
*/
