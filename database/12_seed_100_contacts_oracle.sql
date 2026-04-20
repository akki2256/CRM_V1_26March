-- =============================================================================
-- Oracle: 100 sample rows in CONTACT (see 07_create_contact_oracle.sql)
-- =============================================================================
-- Run after: 07_create_contact_oracle.sql, 11_seed_group_users_oracle.sql
--
-- Removes prior seed rows: customer email pattern seed.contact%@example.com
-- Inserts 100 contacts. owner_name, sub_owner_name, account_name rotate through:
--   Seed Administrator, Seed Agent, Seed Lead, Seed Manager
-- so each full name appears 25 times in each of the three columns.
--
-- SQL*Plus / SQLcl: run entire file. The "/" on its own line executes the PL/SQL block.
-- SQL Developer: run as script (F5), or run the DELETE then the DECLARE...END block
--                and execute the block with the "/" separator included.
-- =============================================================================

SET DEFINE OFF;

DELETE FROM CONTACT
WHERE email LIKE 'seed.contact%@example.com';

DECLARE
    TYPE t_names IS VARRAY(4) OF VARCHAR2(150);
    v_names t_names := t_names(
        'Seed Administrator',
        'Seed Agent',
        'Seed Lead',
        'Seed Manager'
    );
    v_owner     VARCHAR2(150);
    v_sub       VARCHAR2(150);
    v_account   VARCHAR2(150);
    v_cname     VARCHAR2(120);
    v_email     VARCHAR2(254);
    v_phone     VARCHAR2(20);
    v_mort      CHAR(1);
    v_type      VARCHAR2(20);
    v_seg       VARCHAR2(30);
    v_stat      VARCHAR2(20);
BEGIN
    FOR n IN 1 .. 100 LOOP
        v_owner   := v_names(MOD(n - 1, 4) + 1);
        v_sub     := v_names(MOD(n, 4) + 1);
        v_account := v_names(MOD(n + 1, 4) + 1);

        v_cname :=
            CASE MOD(n, 4)
                WHEN 0 THEN 'Alpha Prospect'
                WHEN 1 THEN 'Bravo Prospect'
                WHEN 2 THEN 'Charlie Prospect'
                ELSE 'Delta Prospect'
            END;

        v_email := 'seed.contact' || TO_CHAR(n) || '@example.com';
        v_phone := LPAD(TO_CHAR(MOD(n, 100000000)), 9, '0');

        v_mort := CASE WHEN MOD(n, 2) = 0 THEN 'Y' ELSE 'N' END;
        v_type := CASE WHEN MOD(n, 2) = 0 THEN 'People' ELSE 'Organization' END;
        v_seg  := CASE WHEN MOD(n, 2) = 0 THEN 'Master List' ELSE 'Online' END;
        v_stat := CASE WHEN MOD(n, 2) = 0 THEN 'Active' ELSE 'Inactive' END;

        INSERT INTO CONTACT (
            agent_email,
            contact_name,
            country_code,
            phone_number,
            email,
            product_code,
            purpose_of_loan,
            address_text,
            customer_income,
            employment_status_code,
            mortgage_yn,
            other_existing_loans_yn,
            credit_card_yn,
            type_code,
            segment_code,
            status_code,
            label_code,
            owner_name,
            sub_owner_name,
            account_name,
            created_dt,
            created_by,
            last_upd_dt,
            last_upd_by,
            oca_control
        ) VALUES (
            'seed.agent' || TO_CHAR(n) || '@example.com',
            v_cname,
            '1',
            v_phone,
            v_email,
            'SEED_PRODUCT',
            'Seed purpose of loan for testing row ' || TO_CHAR(n),
            'Seed address ' || TO_CHAR(n),
            ROUND(MOD(n * 137, 250000)) / 100,
            'EMPLOYED',
            v_mort,
            v_mort,
            v_mort,
            v_type,
            v_seg,
            v_stat,
            'SEED_LABEL',
            v_owner,
            v_sub,
            v_account,
            CURRENT_TIMESTAMP,
            'SEED_SCRIPT',
            CURRENT_TIMESTAMP,
            'SEED_SCRIPT',
            0
        );
    END LOOP;
END;
/

COMMIT;
