-- AI-owned tables in postgres-ai. No other service ever writes here - see
-- docs/architecture/service-ownership.md. IDs are generated in Python
-- (uuid.uuid4()) rather than via a Postgres extension, so this file has no
-- CREATE EXTENSION dependency.

CREATE TABLE IF NOT EXISTS ai_events (
    event_type varchar(100) NOT NULL,
    company_id uuid NOT NULL,
    count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (event_type, company_id)
);

CREATE TABLE IF NOT EXISTS processed_events (
    event_id uuid PRIMARY KEY,
    consumer_name varchar(100) NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_jobs (
    id uuid PRIMARY KEY,
    job_type varchar(100) NOT NULL,
    aggregate_id uuid NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'completed',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id uuid PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES ai_jobs (id),
    appointment_id uuid NOT NULL,
    company_id uuid NOT NULL,
    summary text NOT NULL,
    confidence numeric(3, 2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id uuid PRIMARY KEY,
    company_id uuid NOT NULL,
    insight_type varchar(100) NOT NULL,
    summary text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_daily_stats (
    company_id uuid NOT NULL,
    day date NOT NULL,
    review_count integer NOT NULL DEFAULT 0,
    rating_sum numeric(8, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (company_id, day)
);

-- Reserved for future specialist-level analytics - not populated yet because
-- review.received (see contracts/events/review.received.v1.json) doesn't
-- carry a specialistProfileId. Kept here so the target schema is visible.
CREATE TABLE IF NOT EXISTS specialist_daily_stats (
    specialist_profile_id uuid NOT NULL,
    day date NOT NULL,
    review_count integer NOT NULL DEFAULT 0,
    rating_sum numeric(8, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (specialist_profile_id, day)
);
