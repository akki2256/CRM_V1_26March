-- Optional helper for existing Oracle schemas:
-- Creates explicit sequences and sets column defaults to use them.

DECLARE
  v_max NUMBER;
  v_exists NUMBER;
  v_is_identity NUMBER;

  PROCEDURE drop_identity_if_present(p_table_name VARCHAR2, p_column_name VARCHAR2) IS
  BEGIN
    SELECT COUNT(*)
      INTO v_is_identity
      FROM user_tab_identity_cols
     WHERE table_name = UPPER(p_table_name)
       AND column_name = UPPER(p_column_name);

    IF v_is_identity > 0 THEN
      BEGIN
        EXECUTE IMMEDIATE 'ALTER TABLE ' || p_table_name || ' MODIFY ' || p_column_name || ' DROP IDENTITY';
      EXCEPTION
        WHEN OTHERS THEN
          EXECUTE IMMEDIATE 'ALTER TABLE ' || p_table_name || ' MODIFY (' || p_column_name || ' DROP IDENTITY)';
      END;
    END IF;
  END;
BEGIN
  SELECT COUNT(*) INTO v_exists FROM user_sequences WHERE sequence_name = 'SEQ_USERS';
  IF v_exists = 0 THEN
    SELECT NVL(MAX(user_id), 0) + 1 INTO v_max FROM users;
    EXECUTE IMMEDIATE 'CREATE SEQUENCE seq_users START WITH ' || v_max || ' INCREMENT BY 1 NOCACHE NOCYCLE';
  END IF;
  drop_identity_if_present('users', 'user_id');
  EXECUTE IMMEDIATE 'ALTER TABLE users MODIFY (user_id DEFAULT seq_users.NEXTVAL)';

  SELECT COUNT(*) INTO v_exists FROM user_sequences WHERE sequence_name = 'SEQ_GROUPS';
  IF v_exists = 0 THEN
    SELECT NVL(MAX(group_id), 0) + 1 INTO v_max FROM groups;
    EXECUTE IMMEDIATE 'CREATE SEQUENCE seq_groups START WITH ' || v_max || ' INCREMENT BY 1 NOCACHE NOCYCLE';
  END IF;
  drop_identity_if_present('groups', 'group_id');
  EXECUTE IMMEDIATE 'ALTER TABLE groups MODIFY (group_id DEFAULT seq_groups.NEXTVAL)';

  SELECT COUNT(*) INTO v_exists FROM user_sequences WHERE sequence_name = 'SEQ_CONTACT';
  IF v_exists = 0 THEN
    SELECT NVL(MAX(contact_id), 0) + 1 INTO v_max FROM contact;
    EXECUTE IMMEDIATE 'CREATE SEQUENCE seq_contact START WITH ' || v_max || ' INCREMENT BY 1 NOCACHE NOCYCLE';
  END IF;
  drop_identity_if_present('contact', 'contact_id');
  EXECUTE IMMEDIATE 'ALTER TABLE contact MODIFY (contact_id DEFAULT seq_contact.NEXTVAL)';
END;
/
