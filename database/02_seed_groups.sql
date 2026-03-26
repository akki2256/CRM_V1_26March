-- Seed the four application groups (idempotent inserts by group_name)

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Admin', 'SYSTEM', NOW(), 'SYSTEM', NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Admin');

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Agent', 'SYSTEM', NOW(), 'SYSTEM', NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Agent');

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Lead', 'SYSTEM', NOW(), 'SYSTEM', NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Lead');

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Manager', 'SYSTEM', NOW(), 'SYSTEM', NOW(), 0
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Manager');
