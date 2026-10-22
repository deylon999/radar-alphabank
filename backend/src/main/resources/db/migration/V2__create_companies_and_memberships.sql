ALTER TABLE users ADD COLUMN can_view_quality_metrics BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE companies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name VARCHAR(500) NOT NULL,
    inn VARCHAR(12),
    origin VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT companies_origin_check CHECK (origin IN ('dataset', 'user'))
);

CREATE TABLE memberships (
    user_id UUID PRIMARY KEY REFERENCES users (id),
    company_id TEXT NOT NULL REFERENCES companies (id),
    role VARCHAR(16) NOT NULL,
    position VARCHAR(16),
    joined_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT memberships_role_check CHECK (role IN ('owner', 'member')),
    CONSTRAINT memberships_position_check
        CHECK (position IN ('owner', 'ceo', 'cfo', 'accountant', 'treasurer', 'other'))
);

CREATE UNIQUE INDEX memberships_one_owner_per_company ON memberships (company_id) WHERE role = 'owner';

CREATE INDEX memberships_company_id ON memberships (company_id);
