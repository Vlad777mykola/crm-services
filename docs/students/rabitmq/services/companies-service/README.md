# companies-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Owns company records and AI insight projections.

## Quick diagram

```text
HTTP → outbox → company.created/updated → domain.events
ai.company_insight_created ← analytics.events ← (no publisher found in ai-service)
```

## Publishes

`company.created`, `company.updated` → `domain.events` via `companies_schema.outbox_events`

## Consumes

`ai.company_insight_created` from `analytics.events` on `companies-service.q`

## Queue

`companies-service.q` · Dead: `companies.dead.q`

## Outbox / Idempotency

`companies_schema.outbox_events` · `processed_events` (`companies-service`)

## Code

[`services/companies-service/src/rabbitmq/`](../../../../../services/companies-service/src/rabbitmq/) · [`handlers/ai-company-insight-created.ts`](../../../../../services/companies-service/src/handlers/ai-company-insight-created.ts)

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
