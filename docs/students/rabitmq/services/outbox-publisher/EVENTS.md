# outbox-publisher — Events

This service does not own event types. It publishes rows from any schema's `outbox_events` table.

Row columns drive routing: `exchange`, `routing_key` (or `routingKey`), `payload`, `event_type`.

See producer services' EVENTS.md for event inventory.
