-- Replace agent_name with agent_email on existing CONTACT tables.
-- Run once against databases created from 07_create_contact_oracle.sql before this change.
-- Review and adjust the backfill address if you prefer a different placeholder for legacy rows.

ALTER TABLE CONTACT ADD agent_email VARCHAR2(254);

UPDATE CONTACT
SET agent_email = 'legacy-migration@placeholder.invalid'
WHERE agent_email IS NULL;

ALTER TABLE CONTACT MODIFY agent_email NOT NULL;

ALTER TABLE CONTACT DROP CONSTRAINT chk_contact_agent_name_chars;

ALTER TABLE CONTACT DROP COLUMN agent_name;

ALTER TABLE CONTACT ADD CONSTRAINT chk_contact_agent_email_format
    CHECK (REGEXP_LIKE(agent_email, '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
