# rabbitmq-lab-service — Developer Guide

## Status

**CURRENT VERIFIED**

## Code map

| Area | Path |
| ---- | ---- |
| Namespace guard | `src/rabbitmq/names.ts` |
| Connection | `src/rabbitmq/connection.ts` |
| Channel + guarded assert/bind | `src/rabbitmq/channel.ts` |
| Shared exchange topology | `src/rabbitmq/topology.ts` |
| Publisher (guarded) | `src/rabbitmq/publisher.ts` |
| Consumer | `src/rabbitmq/consumer.ts` |
| Labs | `src/labs/<lab-name>/` |
| HTTP | `src/http/` |
| Health | `src/health/state.ts` |

## Publishing architecture

Direct publish is intentional here (`publishToStudentExchange` /
`publishToDefaultExchange`), unlike real CRM services which must use the
transactional outbox (see
[docs/students/rabitmq/common/05-publishing-and-outbox.md](../../common/05-publishing-and-outbox.md)).
This lab has no business database and no business transaction to guarantee
atomicity with — LAB-07 will add a lab-only outbox specifically to *teach*
that pattern, not because this service needs one for its own correctness.

## Consumer architecture

`consumeStudentQueue()` (`src/rabbitmq/consumer.ts`): `prefetch(1)`, manual
ACK after the handler resolves, NACK without requeue on failure in early labs.
Same ACK/NACK *shape* as `metrics-service`, deliberately not shared as a package.

## Connection lifecycle (lab vs production)

**Production CRM services** use `@crm/messaging-kit` `connectManaged()` —
see [common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md).

**This lab** keeps an educational copy in `src/rabbitmq/connection.ts` with
the same ideas (reconnect, `onConnect` callback, readiness) so students see
the pattern without importing production shared code. The lab does **not**
use `handleConsumerFailure` / tier retry topology on the main student queues
(those are taught in dedicated lab HTTP routes and in production docs).

## Repository/database transaction rules

N/A — no database yet (LAB-07).

## How to add a new lab

1. Create `src/labs/<name>/index.ts`
2. Only ever call `assertStudentExchange` / `assertStudentQueue` /
   `bindStudentQueue` / `publishToStudentExchange` /
   `publishToDefaultExchange` — never `channel.assertExchange` /
   `channel.publish` directly (this is also enforced by
   `yarn check:rabbitmq-lab`, see below)
3. Wire it into `src/main.ts`'s `onConnect`
4. Add HTTP routes under `src/http/routes/` if the lab needs a trigger
5. Add a lesson file under `docs/students/rabitmq/lab-service/`
6. Add unit tests (guard behavior) and, if useful, an integration test under
   `tests/integration/`

## How to add a consumed/observed real event

Only for LAB-08 (`companies-observer`) and only via `bindStudentQueue()`,
which allows `domain.events` / `analytics.events` explicitly as *bind*
sources — never as *assert*/*publish* targets. See
`src/rabbitmq/channel.ts#bindStudentQueue` and
`src/rabbitmq/names.ts#assertObservableExchange`.

## How idempotency must work

Not implemented yet — LAB-07 will mirror the real CRM inbox pattern
(`processed_events` insert + business effect + commit, in that order, inside
one transaction) using a lab-only schema, purely for teaching.

## Error/retry rules

- Student queue labs: NACK without requeue on handler failure (no tier topology on those queues)
- Dedicated lab routes teach DLX, retry tiers, parking separately
- Production tier retry: `@crm/messaging-kit` — not imported here

## What not to do

- ❌ Call `channel.assertExchange` / `channel.assertQueue` / `channel.publish`
  directly from lab code — always go through the guarded helpers in
  `rabbitmq/channel.ts` and `rabbitmq/publisher.ts`
- ❌ Add a queue/exchange name that doesn't start with `student.rabbitmq-lab.`
- ❌ Bind a lab queue to anything other than a student exchange or a real
  domain exchange from the allow-list in `rabbitmq/names.ts`
- ❌ Add `rabbitmq-lab-service` to `docker/dev/compose.services.yml` or any
  `docker/prod/*.yml`
- ❌ Import another service's `src/**` (blocked by `no-cross-service-imports`
  in `.dependency-cruiser.cjs` and by `yarn check:rabbitmq-lab`)
- ❌ Import `@crm/messaging-kit` — lab teaches the pattern locally
- ❌ Do an immediate `nack(requeue=true)` loop on failure

## Code review checklist

- [ ] Every new exchange/queue name starts with `student.rabbitmq-lab.`
- [ ] No direct `channel.assertExchange`/`assertQueue`/`publish` calls outside
      `rabbitmq/channel.ts` and `rabbitmq/publisher.ts`
- [ ] `yarn check:rabbitmq-lab` passes
- [ ] `yarn lint:architecture` passes (no cross-service imports)
- [ ] A lesson file exists or was updated under `docs/students/rabitmq/lab-service/`
- [ ] Tests: guard behavior (unit) + broker round-trip (integration, if the
      lab is meant to be run against a real broker)
