# Debugging Messaging

## Current status

**CURRENT VERIFIED**

---

## Something failed — where to look?

### 1. Is RabbitMQ up?

- Management UI: http://localhost:15672
- `docker compose -f docker/dev/compose.infra.yml --profile events ps`

### 2. Is the consumer connected?

Management UI → Connections, Consumers tabs.

### 3. Queue depth growing?

Queues tab → check `{service}.q` message count. If growing, consumer may be down or failing.

### 4. Dead-letter queue?

Check `{service}.dead.q` for poison messages.

### 5. Outbox stuck?

```sql
SELECT * FROM auth_schema.outbox_events WHERE status = 'pending' ORDER BY created_at;
```

Replace schema as needed.

### 6. Service logs

Consumer errors, validation failures, DB constraint violations.

### 7. processed_events

Check if event was already processed (duplicate skip).

---

## Common failure modes

| Symptom | Likely cause |
| ------- | ------------ |
| Event never arrives | Outbox pending; publisher down; wrong routing key |
| Duplicate side effects | Missing/broken idempotency |
| Message in DLQ | Handler exception; validation failure |
| Consumer not receiving | Wrong binding; wrong vhost |
| Outbox `failed` | MAX_ATTEMPTS exceeded |

---

## Tools

- RabbitMQ Management UI
- `scripts/messaging/cli.mjs`
- `yarn messaging:dlq:list` (verify in package.json)
- Per-service health endpoints

---

## Trace a single event

1. Find `event_id` in outbox table or envelope
2. Follow `correlationId` in logs across services
3. Check each consumer's `processed_events`
4. Verify binding in topology file

---

## Next

[12-operations.md](./12-operations.md)
