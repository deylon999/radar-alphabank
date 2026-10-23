CREATE TABLE totp_factors (
    user_id UUID PRIMARY KEY REFERENCES users (id),
    secret_ciphertext BYTEA NOT NULL,
    last_used_step BIGINT NOT NULL,
    enabled_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE recovery_codes (
    user_id UUID NOT NULL REFERENCES totp_factors (user_id) ON DELETE CASCADE,
    code_hash CHAR(64) NOT NULL,
    PRIMARY KEY (user_id, code_hash)
);
