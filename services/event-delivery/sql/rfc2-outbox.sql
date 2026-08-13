-- RFC2 broker-neutral outbox (per service schema).
CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY,
  "eventType" varchar(100) NOT NULL,
  "aggregateType" varchar(100) NOT NULL,
  "aggregateId" uuid NOT NULL,
  payload jsonb NOT NULL,
  version varchar(20) NOT NULL DEFAULT '1.0',
  "correlationId" uuid,
  "causationId" uuid,
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventId" uuid NOT NULL REFERENCES outbox_events (id) ON DELETE CASCADE,
  sink varchar(50) NOT NULL,
  "logicalDestination" varchar(200) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  "nextRetryAt" timestamptz NOT NULL DEFAULT now(),
  "lockedBy" varchar(200),
  "lockedAt" timestamptz,
  "leaseUntil" timestamptz,
  "confirmedAt" timestamptz,
  "lastError" text,
  UNIQUE ("eventId", sink)
);

CREATE INDEX IF NOT EXISTS "IDX_outbox_deliveries_pending_claim"
  ON outbox_deliveries (status, "nextRetryAt", "leaseUntil")
  WHERE status = 'pending';
