# appointments-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Appointments lifecycle + projection tables for companies, members, services, AI recommendations.

## Quick diagram — Example B

```text
appointment.requested → domain.events
  ├─ notifications-service
  ├─ ai-service
  └─ metrics-service
```

## Publishes

`appointment.requested`, `appointment.approved`, `appointment.rejected`, `appointment.completed`, `appointment.cancelled`

## Consumes

**domain.events:** `company.created`, `company.updated`, `company-member.added`, `company-member.removed`, `service.created`, `service.updated`, `specialist-service.assigned`, `specialist-service.removed`

**analytics.events:** `ai.appointment_recommendation_created`

## Queue

`appointments-service.q` · Outbox: `appointments_schema` · Idempotency: yes

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
