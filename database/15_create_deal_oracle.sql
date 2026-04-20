-- DEAL table (Oracle). Links CONTACT, USERS (deal owner), and STAGE.
-- Prerequisites: 01_create_tables_oracle.sql, 07_create_contact_oracle.sql, 13_create_stage_oracle.sql

CREATE SEQUENCE seq_deal START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE DEAL (
    deal_id             NUMBER DEFAULT seq_deal.NEXTVAL NOT NULL,
    contact_id          NUMBER NOT NULL,
    user_id             NUMBER NOT NULL,
    closing_date        TIMESTAMP(6) NOT NULL,
    stage_id            NUMBER NOT NULL,
    amount              NUMBER(18, 2) NOT NULL,
    deal_date           TIMESTAMP(6) NOT NULL,
    pipeline            VARCHAR2(200) NOT NULL,
    currency            VARCHAR2(10) NOT NULL,
    created_by          VARCHAR2(100) NOT NULL,
    created_date        TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_by     VARCHAR2(100) NOT NULL,
    last_updated_date   TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    oca_control         NUMBER(19) DEFAULT 0 NOT NULL,
    CONSTRAINT pk_deal PRIMARY KEY (deal_id),
    CONSTRAINT fk_deal_contact FOREIGN KEY (contact_id) REFERENCES CONTACT (contact_id),
    CONSTRAINT fk_deal_user FOREIGN KEY (user_id) REFERENCES USERS (user_id),
    CONSTRAINT fk_deal_stage FOREIGN KEY (stage_id) REFERENCES STAGE (stage_id),
    CONSTRAINT chk_deal_amount CHECK (amount >= 0),
    CONSTRAINT chk_deal_oca CHECK (oca_control >= 0)
);

CREATE INDEX idx_deal_contact ON DEAL (contact_id);
CREATE INDEX idx_deal_user ON DEAL (user_id);
CREATE INDEX idx_deal_stage ON DEAL (stage_id);
CREATE INDEX idx_deal_deal_date ON DEAL (deal_date);
