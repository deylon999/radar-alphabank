CREATE TABLE join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES companies (id),
    applicant_id UUID NOT NULL REFERENCES users (id),
    status VARCHAR(16) NOT NULL,
    position VARCHAR(16),
    message VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    CONSTRAINT join_requests_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    CONSTRAINT join_requests_position_check
        CHECK (position IN ('owner', 'ceo', 'cfo', 'accountant', 'treasurer', 'other'))
);

CREATE UNIQUE INDEX join_requests_one_pending_per_applicant
    ON join_requests (applicant_id) WHERE status = 'pending';

CREATE INDEX join_requests_company_status ON join_requests (company_id, status, created_at);
