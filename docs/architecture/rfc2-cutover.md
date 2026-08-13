# RFC2 clean cutover (dev/test/verify)

When broker-neutral `outbox_events` + `outbox_deliveries` replace RFC1 transport-coupled outbox:

1. Stop frontend/services, consumers, legacy outbox publishers, AI publisher
2. Purge application RabbitMQ queues (main, retry, parking/dead)
3. Drop/recreate main DB and postgres-ai if participating
4. Run migrations including [`services/event-delivery/sql/rfc2-outbox.sql`](../../services/event-delivery/sql/rfc2-outbox.sql) per schema
5. Seed deterministic data
6. Deploy `event-delivery` workers and restart services
7. Verify end-to-end: domain mutation → outbox_event → delivery row → RabbitMqSink → consumer inbox TX

**Production:** once real data exists, use controlled migrations only — no drop/recreate.

Purging RabbitMQ queues matters: old queued events can survive while DB state is destroyed.
