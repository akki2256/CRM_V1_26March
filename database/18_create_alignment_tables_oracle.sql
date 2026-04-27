-- ALIGNMENTS master and USER_ALIGNMENTS mapping table
-- One-time seed for default alignments.

CREATE SEQUENCE seq_alignment START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE ALIGNMENTS (
    alignment_id       NUMBER DEFAULT seq_alignment.NEXTVAL NOT NULL,
    alignment_name     VARCHAR2(120) NOT NULL,
    created_by         VARCHAR2(100) NOT NULL,
    created_date       TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_by    VARCHAR2(100) NOT NULL,
    last_updated_date  TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    oca_control        NUMBER(19) DEFAULT 0 NOT NULL,
    CONSTRAINT pk_alignments PRIMARY KEY (alignment_id),
    CONSTRAINT uq_alignments_name UNIQUE (alignment_name)
);

CREATE TABLE USER_ALIGNMENTS (
    user_id            NUMBER(19) NOT NULL,
    alignment_id       NUMBER(19) NOT NULL,
    created_by         VARCHAR2(100) NOT NULL,
    created_date       TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_by    VARCHAR2(100) NOT NULL,
    last_updated_date  TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    oca_control        NUMBER(19) DEFAULT 0 NOT NULL,
    CONSTRAINT pk_user_alignments PRIMARY KEY (user_id, alignment_id),
    CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES USERS (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ua_alignment FOREIGN KEY (alignment_id) REFERENCES ALIGNMENTS (alignment_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_alignments_user ON USER_ALIGNMENTS (user_id);
CREATE INDEX idx_user_alignments_alignment ON USER_ALIGNMENTS (alignment_id);

INSERT INTO ALIGNMENTS (alignment_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
VALUES ('Personal Loans', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP, 0);

INSERT INTO ALIGNMENTS (alignment_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
VALUES ('Business Loans', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP, 0);

INSERT INTO ALIGNMENTS (alignment_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
VALUES ('Equity Loans', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP, 0);

INSERT INTO ALIGNMENTS (alignment_name, created_by, created_date, last_updated_by, last_updated_date, oca_control)
VALUES ('Car Loans', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP, 0);
