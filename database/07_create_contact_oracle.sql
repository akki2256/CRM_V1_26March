-- CONTACT table for Create New > Contact popup.
-- Includes mandatory checks, indexes, and audit columns.

CREATE SEQUENCE seq_contact START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

CREATE TABLE contact (
    contact_id               NUMBER DEFAULT seq_contact.NEXTVAL NOT NULL,
    agent_name               VARCHAR2(120)  NOT NULL,
    contact_name             VARCHAR2(120)  NOT NULL,
    country_code             VARCHAR2(8)    NOT NULL,
    phone_number             VARCHAR2(20)   NOT NULL,
    email                    VARCHAR2(254)  NOT NULL,
    product_code             VARCHAR2(64),
    purpose_of_loan          VARCHAR2(500)  NOT NULL,
    address_text             VARCHAR2(500),
    customer_income          NUMBER(14,2),
    employment_status_code   VARCHAR2(64)   NOT NULL,
    mortgage_yn              CHAR(1)        NOT NULL,
    other_existing_loans_yn  CHAR(1)        NOT NULL,
    credit_card_yn           CHAR(1)        NOT NULL,
    type_code                VARCHAR2(20),
    segment_code             VARCHAR2(30),
    status_code              VARCHAR2(20),
    label_code               VARCHAR2(30),
    owner_name               VARCHAR2(150),
    sub_owner_name           VARCHAR2(150),
    account_name             VARCHAR2(150),

    created_dt               TIMESTAMP(6)   NOT NULL,
    created_by               VARCHAR2(100)  NOT NULL,
    last_upd_dt              TIMESTAMP(6)   NOT NULL,
    last_upd_by              VARCHAR2(100)  NOT NULL,
    oca_control              NUMBER(19)     NOT NULL,

    CONSTRAINT pk_contact PRIMARY KEY (contact_id),

    CONSTRAINT uq_contact_email UNIQUE (email),

    CONSTRAINT chk_contact_agent_name_chars CHECK (REGEXP_LIKE(agent_name, '^[A-Za-z ]+$')),
    CONSTRAINT chk_contact_name_chars CHECK (REGEXP_LIKE(contact_name, '^[A-Za-z ]+$')),
    CONSTRAINT chk_contact_country_code_digits CHECK (REGEXP_LIKE(country_code, '^[0-9]+$')),
    CONSTRAINT chk_contact_phone_digits CHECK (REGEXP_LIKE(phone_number, '^[0-9]+$')),
    CONSTRAINT chk_contact_email_format CHECK (REGEXP_LIKE(email, '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),

    CONSTRAINT chk_contact_income_non_negative CHECK (customer_income IS NULL OR customer_income >= 0),

    CONSTRAINT chk_contact_mortgage_yn CHECK (mortgage_yn IN ('Y', 'N')),
    CONSTRAINT chk_contact_other_loans_yn CHECK (other_existing_loans_yn IN ('Y', 'N')),
    CONSTRAINT chk_contact_credit_card_yn CHECK (credit_card_yn IN ('Y', 'N')),

    CONSTRAINT chk_contact_type_code CHECK (type_code IS NULL OR type_code IN ('People', 'Organization')),
    CONSTRAINT chk_contact_segment_code CHECK (segment_code IS NULL OR segment_code IN ('Master List', 'Online')),
    CONSTRAINT chk_contact_status_code CHECK (status_code IS NULL OR status_code IN ('Active', 'Inactive')),

    CONSTRAINT chk_contact_oca CHECK (oca_control >= 0)
);

CREATE INDEX idx_contact_phone ON contact (country_code, phone_number);
CREATE INDEX idx_contact_product ON contact (product_code);
CREATE INDEX idx_contact_employment_status ON contact (employment_status_code);
CREATE INDEX idx_contact_status_code ON contact (status_code);
CREATE INDEX idx_contact_owner ON contact (owner_name);
CREATE INDEX idx_contact_created_dt ON contact (created_dt);
