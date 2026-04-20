-- Seed STAGE rows (Oracle). Run after 13_create_stage_oracle.sql.
-- Idempotent: inserts each stage only if that stage_name is not already present.

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Lead Generated', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Lead Generated');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Documents Received', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Documents Received');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Rate quote Generated', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Rate quote Generated');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Documents Pending', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Documents Pending');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Application Pending', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Application Pending');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Converted to Application', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Converted to Application');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'In Progress', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'In Progress');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Application Approved', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Application Approved');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Not Approved', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Not Approved');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Application Withdrawn', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Application Withdrawn');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Not Eligible', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Not Eligible');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Future Prospect', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Future Prospect');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Closed Won', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Closed Won');

INSERT INTO STAGE (stage_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
SELECT 'Closed Lost', 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM STAGE WHERE stage_name = 'Closed Lost');

COMMIT;
