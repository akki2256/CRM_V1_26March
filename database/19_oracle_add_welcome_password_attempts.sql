-- Add welcome_password_attempts to USERS (tracks failed logins with emailed welcome password).
-- Safe to re-run: only adds the column when missing.

DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM user_tab_columns
    WHERE table_name = 'USERS'
      AND column_name = 'WELCOME_PASSWORD_ATTEMPTS';

    IF v_count = 0 THEN
        EXECUTE IMMEDIATE
            'ALTER TABLE USERS ADD welcome_password_attempts NUMBER(10) DEFAULT 0 NOT NULL';
    END IF;
END;
/
