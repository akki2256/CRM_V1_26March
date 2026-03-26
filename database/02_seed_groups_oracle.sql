-- Seed the four application groups (Oracle 21c)

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Admin', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Admin');

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Agent', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Agent');

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Lead', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Lead');

INSERT INTO "groups" (group_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Manager', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM "groups" WHERE group_name = 'Manager');
