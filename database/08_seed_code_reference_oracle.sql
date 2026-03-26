-- Seed CODE_REFERENCE rows used by current frontend dropdowns/radio options.
-- CATEGORY_SID + CODE forms the PK.

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'PRODUCT_CONTACT', 'business loan', 1, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'PRODUCT_CONTACT' AND code = 'business loan');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'PRODUCT_CONTACT', 'personal loan', 2, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'PRODUCT_CONTACT' AND code = 'personal loan');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'PRODUCT_CONTACT', 'car loan', 3, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'PRODUCT_CONTACT' AND code = 'car loan');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'PRODUCT_CONTACT', 'cashflow', 4, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'PRODUCT_CONTACT' AND code = 'cashflow');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'PRODUCT_CONTACT', 'consolidation', 5, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'PRODUCT_CONTACT' AND code = 'consolidation');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'PRODUCT_CONTACT', 'home improvement', 6, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'PRODUCT_CONTACT' AND code = 'home improvement');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'PRODUCT_CONTACT', 'medical', 7, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'PRODUCT_CONTACT' AND code = 'medical');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'EMPLOYMENT_STATUS_CONTACT', 'Self employed', 1, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'EMPLOYMENT_STATUS_CONTACT' AND code = 'Self employed');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'EMPLOYMENT_STATUS_CONTACT', 'Full time', 2, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'EMPLOYMENT_STATUS_CONTACT' AND code = 'Full time');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'EMPLOYMENT_STATUS_CONTACT', 'part time', 3, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'EMPLOYMENT_STATUS_CONTACT' AND code = 'part time');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'EMPLOYMENT_STATUS_CONTACT', 'casual', 4, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'EMPLOYMENT_STATUS_CONTACT' AND code = 'casual');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'EMPLOYMENT_STATUS_CONTACT', 'sole trader', 5, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'EMPLOYMENT_STATUS_CONTACT' AND code = 'sole trader');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'LABEL_CONTACT', 'cold', 1, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'LABEL_CONTACT' AND code = 'cold');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'LABEL_CONTACT', 'hot', 2, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'LABEL_CONTACT' AND code = 'hot');

INSERT INTO code_reference (category_sid, code, sequence_no, created_dt, created_by, last_upd_dt, last_upd_by, oca_control)
SELECT 'LABEL_CONTACT', 'warm', 3, CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', 0 FROM dual
WHERE NOT EXISTS (SELECT 1 FROM code_reference WHERE category_sid = 'LABEL_CONTACT' AND code = 'warm');
