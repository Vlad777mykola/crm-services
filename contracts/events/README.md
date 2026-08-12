# contracts/events

Shared, hand-written JSON Schema definitions for every message that crosses RabbitMQ.
Every message uses the [`envelope.v1.json`](envelope.v1.json) wrapper; each file below
describes only the `data` field for one event type.

Node and Python services **type against these schemas locally** (hand-written TypeScript
interfaces / Python dataclasses that mirror them) - they never import backend domain
modules to get these shapes, matching the "no shared private code between services" rule
in [`docs/architecture/service-ownership.md`](../../docs/architecture/service-ownership.md).

## Domain events (exchange: `domain.events`)

Published by the backend via the outbox pattern (see [`docs/architecture/event-driven-model.md`](../../docs/architecture/event-driven-model.md)), or, since Phase 2, by an extracted service via its own outbox.

- [`appointment.requested.v1.json`](appointment.requested.v1.json)
- [`appointment.approved.v1.json`](appointment.approved.v1.json)
- [`appointment.rejected.v1.json`](appointment.rejected.v1.json)
- [`appointment.cancelled.v1.json`](appointment.cancelled.v1.json)
- [`appointment.completed.v1.json`](appointment.completed.v1.json)
- [`review.received.v1.json`](review.received.v1.json)
- [`auth.user_registered.v1.json`](auth.user_registered.v1.json) - published by `services/auth-service`, consumed by `services/users-service`.

## Analytics / AI result events (exchange: `analytics.events`)

Published by `services/ai-service`.

- [`analytics.company_rating_updated.v1.json`](analytics.company_rating_updated.v1.json)
- [`ai.appointment_recommendation_created.v1.json`](ai.appointment_recommendation_created.v1.json)
- [`ai.company_insight_created.v1.json`](ai.company_insight_created.v1.json)
- [`ai.job_failed.v1.json`](ai.job_failed.v1.json)

## Naming convention

`<event.type>.v<major>.json` - a breaking payload change bumps the file's major version
and the envelope's `version` field; consumers can keep supporting an old version during a
migration window by checking `version` before decoding `data`.
