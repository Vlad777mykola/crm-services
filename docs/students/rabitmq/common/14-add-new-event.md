# How to Add a New Event

## Current status

**CURRENT VERIFIED** — procedure for current outbox architecture.

---

## Steps

1. **Define the business fact first.** What already happened?

2. **Use past-tense event name:** `company.created`, `appointment.requested`, `review.received`.

3. **Do not use imperative command names** for domain facts.

4. **Add/update event catalog:** `docs/architecture/event-catalog.md`

5. **Create event JSON Schema:** `contracts/events/<event.type>.v1.json`

6. **Validate schema:** `yarn ci:validate-events`

7. **Add producer type** in service code.

8. **Add event creation in same DB TX** as business change.

9. **Write to outbox** via `outbox-repository.ts`.

10. **Do NOT publish RabbitMQ directly** from HTTP handler.

11. **Add routing mapping** in outbox repository (`exchange` + `routingKey`).

12. **Identify intended consumers.**

13. **Update bindings** in each consumer's `topology.ts` / `main.ts`.

14. **Implement consumer handlers** with idempotency.

15. **Add idempotency** (`processed_events`) for each new consumer.

16. **Add producer tests** (outbox row created in TX).

17. **Add consumer tests** (valid event).

18. **Add duplicate test.**

19. **Add failure test.**

20. **Update documentation:**
    - [README.md](../README.md) if architecture changes
    - [SERVICES.md](../SERVICES.md)
    - Producer `EVENTS.md`
    - Consumer `EVENTS.md`
    - `TESTING.md` files

---

## TARGET RFC2 change

**TARGET RFC2 — NOT CURRENT**

Domain producer no longer chooses RabbitMQ exchange/routing key:

```text
eventType → central sink policy → RabbitMqSink / future KafkaSink
```

See [19-rfc2-broker-neutral.md](./19-rfc2-broker-neutral.md).

---

## Next

[15-add-new-consumer.md](./15-add-new-consumer.md)
