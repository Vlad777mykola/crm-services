# Observability Baseline (Phase 13)

Audit performed against every service in `services/` per
`docs/architecture/microservices-extraction-checklist.md` Phase 13. No new
tests were added (manual smoke checklist project convention) — this is a
confirm-or-fix pass, not new infrastructure.

## 13.1 — `X-Request-Id` from the gateway

**Confirmed for every HTTP-facing service.** Every service built from the
`service-skeleton-standard.md` template (`auth-service`, `users-service`,
`companies-service`, `company-members-service`, `specialists-service`,
`company-specialists-service`, `services-catalog-service`,
`appointments-service`, `reviews-service`, `notifications-service`) has an
identical `http/request-logger.ts`: it reads `x-request-id` from the
incoming request, generates one via `randomUUID()` if absent (e.g. local
direct-to-service calls bypassing the gateway), echoes it back as
`X-Request-Id` on the response, and hands it to `pino-http` as the request's
`genReqId` so every log line for that request carries it.

`gateway-routing.md` confirms Traefik forwards the client's `X-Request-Id`
unchanged and that this same generate-if-missing behavior is the documented
fallback (Traefik itself has no nginx-style `$request_id` equivalent — see
Phase 1 Task 1.3).

`metrics-service`, `outbox-publisher`, and `ai-service`'s health endpoints are
not gateway-routed/user-facing, so this doesn't apply to them.

## 13.2 — Structured (JSON) logs

**Confirmed for every Node.js service** — all use `pino` (`src/logger.ts`),
which emits structured JSON by default.

**Gap found and fixed:** `ai-service` (Python) was using plain `print()`
statements, not structured logs. Added `services/ai-service/src/logger.py` (a
minimal `info`/`warn`/`error` JSON-line logger, same shape as pino's: `level`,
`time`, `service`, `message`, plus arbitrary fields) and replaced every
`print()` call in `main.py`, `handlers/appointment_requested.py`, and
`handlers/review_received.py` with it.

## 13.3 — `correlationId` populated on every event

**Populated, but only partially useful today — documented gap, not fixed.**
`contracts/events/envelope.v1.json` requires `correlationId` and every event
does carry a non-blank value: `services/outbox-publisher/src/publisher/poll-and-publish.ts`
assigns `randomUUID()` at publish time. That satisfies the letter of Task
13.3 ("ensure it's populated, not left blank").

It does **not** yet tie back to the HTTP request that caused the event, which
is what `service-skeleton-standard.md`'s stated intent for this field is
("carries the id through to logs and, where applicable, into published event
`correlationId`"). Doing that properly means threading the request's
`X-Request-Id` from the Express request, through the service-layer method
that calls `recordOutboxEvent`, into the `outbox_events` row (a new column),
and having `outbox-publisher` read it back out instead of generating a fresh
one — a schema + call-signature change across every extracted service's
outbox path, not a small fix.

**Recommendation:** treat as a tracked follow-up, not a Phase 13 blocker. If
cross-service request tracing becomes a real debugging need, add a nullable
`"requestId"` column to each `outbox_events` table and pass it down from the
route handler; until then, `correlationId` still uniquely identifies each
event for idempotency/dedup purposes, which is its only currently-relied-on
property (see `service-ownership.md` rule 5).

## 13.4 — Per-event-type counters

**Confirmed.** `services/metrics-service/src/metrics/store.ts` already
exposes `rabbitmq_messages_consumed_by_type_total{service, event_type}` and
`rabbitmq_messages_consumed_by_exchange_total`, both Prometheus counters,
verified by `store.test.ts`.

## 13.5 — `/health/live` + `/health/ready` everywhere

**Confirmed for every service**, including workers/observers without an HTTP
API otherwise: all 10 Express services (`http/health.routes.ts` or, for
`notifications-service`, inlined in `app.ts`), plus `metrics-service`,
`outbox-publisher`, and `ai-service` (Python, `main.py`'s
`make_health_handler`). `/health/ready` checks DB connectivity everywhere a
DB exists, and RabbitMQ connectivity everywhere a consumer exists (every
service that owns a consumer follows the same
`consumer.isConnected()` pattern, most recently added to `companies-service`
in Phase 12 when it got its first consumer).

## 13.6 — Basic alerts (documented, not wired to a paging tool yet)

No alerting tool (Prometheus Alertmanager, Grafana, PagerDuty, etc.) is
provisioned yet — this section documents *what* to alert on once one is;
wiring it up is future work, not blocking Phase 14/15.

| Alert | Signal | Suggested threshold |
|---|---|---|
| Service down | `/health/live` failing, or the process not scraped by Prometheus for N minutes | 2 consecutive failed scrapes (~1 min at 30s scrape interval) |
| Service not ready | `/health/ready` returning 503 (DB or RabbitMQ down for that service) | 3 consecutive failures (~1.5 min) |
| Queue lag | RabbitMQ per-queue `messages_ready` (RabbitMQ management API/exporter, not `metrics-service` today) growing without draining | > 100 messages ready for > 5 min, or growth rate positive for > 10 min |
| Dead-letter growth | Messages landing in any `*.dead.q` (`domain.events.dlx`/`commands.dlx` bound queues) | Any message present (dead-lettering should be rare — a poison message or a real bug, not expected steady-state traffic) |
| DB connection failure | Postgres pool `error` events / repeated `/health/ready` 503s citing DB | Same as "service not ready" above, but distinguishable in logs by the `err` field pino/the Python logger attach |
| Outbox publish lag | `outbox_events` rows with `status = 'pending'` and `createdAt` older than N minutes, per service's own `outbox_events` table | > 5 min old and still pending (outbox-publisher should drain in seconds under normal load) |
| RabbitMQ per-type consume errors | `rabbitmq_message_processing_errors_total` (already exposed by `metrics-service`, see `store.ts`) | Any sustained non-zero rate |

These map 1:1 onto signals already emitted today (health endpoints, metrics
counters, structured logs) — no new instrumentation was required to make
this list actionable once an alerting tool is wired up.
