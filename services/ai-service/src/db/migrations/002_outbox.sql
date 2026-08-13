-- RFC1-compatible transactional outbox on postgres-ai (ai_schema).
CREATE SCHEMA IF NOT EXISTS ai_schema;

CREATE TABLE IF NOT EXISTS ai_schema.outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "eventType" varchar(100) NOT NULL,
    exchange varchar(100) NOT NULL,
    "routingKey" varchar(150) NOT NULL,
    "aggregateType" varchar(100) NOT NULL,
    "aggregateId" uuid NOT NULL,
    payload jsonb NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending',
    attempts int NOT NULL DEFAULT 0,
    "nextRetryAt" timestamptz NOT NULL DEFAULT now(),
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "publishedAt" timestamptz,
    "lockedBy" varchar(200),
    "lockedAt" timestamptz,
    "leaseUntil" timestamptz
);

CREATE INDEX IF NOT EXISTS "IDX_ai_outbox_events_status" ON ai_schema.outbox_events (status);
CREATE INDEX IF NOT EXISTS "IDX_ai_outbox_events_nextRetryAt" ON ai_schema.outbox_events ("nextRetryAt");
