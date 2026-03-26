-- CODE_REFERENCE master table for dropdown/list values.
-- PK: (category_sid, code)

CREATE TABLE code_reference (
    category_sid   VARCHAR2(64)   NOT NULL,
    code           VARCHAR2(128)  NOT NULL,
    sequence_no    NUMBER(10)     NOT NULL,
    created_dt     TIMESTAMP(6)   NOT NULL,
    created_by     VARCHAR2(100)  NOT NULL,
    last_upd_dt    TIMESTAMP(6)   NOT NULL,
    last_upd_by    VARCHAR2(100)  NOT NULL,
    oca_control    NUMBER(19)     NOT NULL,
    CONSTRAINT pk_code_reference PRIMARY KEY (category_sid, code),
    CONSTRAINT chk_code_reference_seq CHECK (sequence_no >= 0),
    CONSTRAINT chk_code_reference_oca CHECK (oca_control >= 0)
);

CREATE INDEX idx_code_ref_category_seq ON code_reference (category_sid, sequence_no);
CREATE INDEX idx_code_ref_code ON code_reference (code);
