# rabbitmq-lab-service

**Development/student-only.** Not deployed to production.

## Run it

```powershell
yarn dev:infra
yarn dev:companies    # optional — real company events for graduation exercise
yarn dev:rabbitmq-lab
```

From repo root, `yarn install` links workspace packages used by other services (`@crm/messaging-kit`). The lab itself does not import messaging-kit — it keeps its own `connectManaged` copy for teaching.

Student UI (when `VITE_ENABLE_RABBITMQ_LAB=true` in frontend): http://localhost:5173/student/rabbitmq

## HTTP API (direct or via gateway `/rabbitmq-lab` prefix)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/health/live` | Process alive |
| GET | `/health/ready` | RabbitMQ + Postgres ready |
| GET | `/api/lab/status` | All lab state |
| GET | `/api/lab/messages` | Received messages snapshot |
| POST | `/api/lab/hello` | Default exchange lab |
| POST | `/api/lab/direct` | Direct routing lab |
| POST | `/api/lab/topic` | Topic routing lab |
| POST | `/api/lab/fanout` | Fanout lab |
| POST | `/api/lab/headers` | Headers exchange lab |
| POST | `/api/lab/work` | Work queue / ACK/NACK lab |
| POST | `/api/lab/confirms` | Publisher confirms + mandatory |
| POST | `/api/lab/failure` | DLX lab |
| POST | `/api/lab/retry` | Retry tier lab |
| POST | `/api/lab/rpc` | Educational RPC |
| POST | `/api/lab/order` | Transactional outbox lab |
| POST | `/api/lab/idempotency` | Inbox / idempotency lab |
| POST | `/api/lab/reset` | Purge student queues only |

## Production contrast

Real CRM consumers use `@crm/messaging-kit`:

- `connectManaged()` — TCP reconnect, `setup()`, `invalidate()`, `isReady()`
- `handleConsumerFailure()` — finite retry tiers + parking

The lab intentionally does **not** import that package. See [docs/students/rabitmq/common/22-connection-lifecycle.md](../../docs/students/rabitmq/common/22-connection-lifecycle.md).

## Docs

[docs/students/rabitmq/lab-service/START-HERE.md](../../docs/students/rabitmq/lab-service/START-HERE.md)

## Verify

```powershell
yarn workspace @crm/rabbitmq-lab-service test
yarn check:rabbitmq-lab
```
