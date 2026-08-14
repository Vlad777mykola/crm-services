# Lesson 25 — Real Companies Flow (Graduation)

## Status

**CURRENT VERIFIED**

## 1. Goal

Trace a real `company.*` event from the CRM frontend through to the lab observer.

## 2. What problem are we solving?

The lab is only useful if it bridges into the real architecture students will work on.

## 3. Mental model

```text
Frontend → gateway → companies-service → outbox → domain.events / company.created
                                              → lab observer (exclusive queue, company.*)
```

## 4. Diagram

See [GRADUATION-CHECKLIST.md](./GRADUATION-CHECKLIST.md).

## 5. RabbitMQ terminology

Observer queue, topic binding `company.*`, at-least-once delivery.

## 6. Existing code example

`services/rabbitmq-lab-service/src/labs/companies-observer/index.ts` — binds `domain.events` with `company.*` on an exclusive auto-delete queue.

## 7. Exercise

Complete the graduation trace documented in [GRADUATION-CHECKLIST.md](./GRADUATION-CHECKLIST.md).

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:companies
yarn dev:rabbitmq-lab
```

## 9. Publish action

Use the **real frontend** — create or update a company (not the lab HTTP API).

## 10. What you should observe

`GET http://localhost:4011/api/lab/status` → `companiesObserver.observed` contains `company.created` or `company.updated` with the real envelope.

Or via gateway: `GET http://localhost:8080/rabbitmq-lab/api/lab/status`.

## 11. RabbitMQ Management UI steps

Queues → find the `amq.gen-*` exclusive queue with a binding `company.*` on `domain.events`.

## 12. Logs you should see

```text
[rabbitmq-lab-service] observed real company event (read-only)
```

## 13. Expected queue state

Observer queue `Ready: 0` after ACK — messages are not retained.

## 14. Failure exercise

Stop `rabbitmq-lab-service` and create a company — event still publishes to `domain.events`; real consumers still work; only the lab observer misses it.

## 15. Cleanup/reset

No lab reset needed — observer queue is auto-deleted when the service stops.

## 16. Questions

Fill in the graduation worksheet fields (HTTP operation, outbox table, routing key, etc.).

## 17. How CRM uses this concept

Every consuming service binds only the patterns it needs on `domain.events` — the lab demonstrates the same pattern read-only.

## 18. Production note

The lab observer must **never** bind to or consume from `companies-service.q` — that would steal messages from the real consumer.

## Next

[GRADUATION-CHECKLIST.md](./GRADUATION-CHECKLIST.md)
