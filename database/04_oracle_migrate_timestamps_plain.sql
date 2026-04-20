-- Optional: run if tables were created with TIMESTAMP WITH TIME ZONE and you hit ORA-18716.
-- Converts audit/expiry columns to plain TIMESTAMP(6) (UTC wall time; app uses LocalDateTime UTC).

ALTER TABLE GROUPS MODIFY (
    created_date      TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_date TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE USERS MODIFY (
    temporary_password_expires_at TIMESTAMP(6),
    created_date                  TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_date             TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE USER_GROUPS MODIFY (
    created_date      TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_date TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
