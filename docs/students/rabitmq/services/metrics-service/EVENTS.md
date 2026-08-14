# metrics-service — Events

## Publish

None.

## Consume

All event types on:

- `domain.events` / `#`
- `analytics.events` / `#`

No per-event handler table — increments in-memory store by `eventType`.
