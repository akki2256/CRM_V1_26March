-- File metadata for deal attachments (Oracle). Run after 15_create_deal_oracle.sql.
-- Actual bytes are stored on the application server filesystem; stored_path holds server-local path.

CREATE SEQUENCE seq_deal_attachment START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE DEAL_ATTACHMENT (
    attachment_id       NUMBER DEFAULT seq_deal_attachment.NEXTVAL NOT NULL,
    deal_id             NUMBER NOT NULL,
    file_name           VARCHAR2(500) NOT NULL,
    content_type        VARCHAR2(200),
    stored_path         VARCHAR2(2000) NOT NULL,
    uploaded_at         TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    uploaded_by         VARCHAR2(100) NOT NULL,
    oca_control         NUMBER(19) DEFAULT 0 NOT NULL,
    CONSTRAINT pk_deal_attachment PRIMARY KEY (attachment_id),
    CONSTRAINT fk_deal_attachment_deal FOREIGN KEY (deal_id) REFERENCES DEAL (deal_id),
    CONSTRAINT chk_deal_attachment_oca CHECK (oca_control >= 0)
);

CREATE INDEX idx_deal_attachment_deal ON DEAL_ATTACHMENT (deal_id);

COMMIT;
