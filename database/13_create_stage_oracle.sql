-- STAGE lookup for deals (Oracle, unquoted identifiers → uppercase names).
-- Run after 01_create_tables_oracle.sql (independent of CONTACT).

CREATE SEQUENCE seq_stage START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE STAGE (
    stage_id            NUMBER DEFAULT seq_stage.NEXTVAL NOT NULL,
    stage_name          VARCHAR2(200) NOT NULL,
    created_by          VARCHAR2(100) NOT NULL,
    created_date        TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_by     VARCHAR2(100) NOT NULL,
    last_updated_date   TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    oca_control         NUMBER(19) DEFAULT 0 NOT NULL,
    CONSTRAINT pk_stage PRIMARY KEY (stage_id),
    CONSTRAINT uq_stage_name UNIQUE (stage_name),
    CONSTRAINT chk_stage_oca CHECK (oca_control >= 0)
);

CREATE INDEX idx_stage_name ON STAGE (stage_name);
