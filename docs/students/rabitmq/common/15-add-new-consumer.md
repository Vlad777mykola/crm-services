# How to Add a New Consumer

## Current status

**CURRENT VERIFIED**

---

## Flow

```text
event contract exists
  ↓
choose service
  ↓
declare service queue
  ↓
binding to correct exchange/key
  ↓
parse envelope
  ↓
runtime validation
  ↓
BEGIN
  ↓
processed_events
  ↓
business handler
  ↓
COMMIT
  ↓
return
  ↓
consumer ACK
```

---

## Developer steps

1. Confirm JSON Schema exists in `contracts/events/`
2. Add binding in `rabbitmq/topology.ts` (or `main.ts` for Python)
3. Declare queue with DLX: `x-dead-letter-exchange: domain.events.dlx`
4. Call `declareRetryTopology()` in `consumer.ts` (or ensure existing consumer already does)
5. Add handler in `handlers/` or `consumer/process-inbound-event.ts`
6. Implement inbox TX with `processed_events`
7. Wire handler in consumer message router (switch on `envelope.type`)
8. Add health check: `consumer.isReady()` for RabbitMQ readiness
9. Add tests: valid, duplicate, failure (and channel-close recovery if touching consumer)
10. Update `EVENTS.md`, `SERVICES.md`, `TESTING.md`

---

## Files to touch (Node service template)

| File | Change |
| ---- | ------ |
| `src/rabbitmq/topology.ts` | Queue + binding |
| `src/rabbitmq/consumer.ts` | Consume loop (usually exists) |
| `src/consumer/process-inbound-event.ts` | Route + TX |
| `src/handlers/<event>.ts` | Business logic |
| `src/idempotency/processed-events-repository.ts` | Dedup |
| `src/db/schema.ts` | `processed_events` if new service |

---

## What not to do

- ACK before commit
- Skip idempotency
- Handler calls `channel.ack()` directly
- New routing key without binding test

---

## Next

[16-add-new-service.md](./16-add-new-service.md)
