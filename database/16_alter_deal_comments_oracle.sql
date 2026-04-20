-- Optional deal-level comments (Oracle). Safe to run if column already exists (check error in SQL*Plus).
-- Hibernate JPA with ddl-auto=update may add this automatically when Deal.dealComments is mapped.

ALTER TABLE DEAL ADD deal_comments VARCHAR2(4000);
