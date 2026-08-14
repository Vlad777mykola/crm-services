# rabbitmq-lab-service — Testing Guide

## Status

**CURRENT VERIFIED**

## Test matrix

| Scenario | Type | Expected result |
| -------- | ---- | --------------- |
| Student name accepted | Unit | `assertStudentName` does not throw |
| Real domain exchange rejected on assert/publish | Unit | throws `"non-student"` |
| Unknown exchange rejected on bind | Unit | `assertObservableExchange` throws |
| Real domain exchange accepted on bind | Unit | `assertObservableExchange` does not throw |
| Publish via default exchange | Unit | `channel.publish('', queue, ...)` called with expected args |
| Publish via default exchange to non-student queue | Unit | throws, `channel.publish` never called |
| Hello round-trip | Integration (needs broker) | published message appears in `getHelloState().received` |
| `yarn check:rabbitmq-lab` | Static | no cross-service imports, no non-student literal names |

## Test: student name guard

**PRECONDITIONS** — none, pure unit test.

**ACTION** — call `assertStudentName('domain.events', 'exchange')`.

**EXPECTED DATABASE STATE** — N/A.

**EXPECTED RABBITMQ STATE** — N/A (no broker call happens; that's the point).

**EXPECTED LOG** — N/A.

**EXPECTED ACK/NACK RESULT** — N/A.

**CLEANUP** — none.

See `services/rabbitmq-lab-service/tests/unit/names.test.ts`.

## Test: hello round-trip

**PRECONDITIONS** — `yarn dev:infra` running (real broker on `localhost:5672`).

**ACTION** — `initHelloLab(channel)` then `publishHello('integration-test-message')`.

**EXPECTED DATABASE STATE** — N/A (no database).

**EXPECTED RABBITMQ STATE** — `student.rabbitmq-lab.hello.q` momentarily holds
one message, then `Ready` returns to 0 after the consumer ACKs it.

**EXPECTED LOG** — `[rabbitmq-lab-service] hello lab received message`.

**EXPECTED ACK/NACK RESULT** — ACK.

**CLEANUP** — `channel.deleteQueue(HELLO_QUEUE)` before the test runs (done in
`beforeAll`/test body) so re-runs start clean.

See `services/rabbitmq-lab-service/tests/integration/hello-lab.test.ts`.

## Running the tests

```powershell
yarn workspace @crm/rabbitmq-lab-service test           # unit only (no broker needed)
yarn dev:infra                                          # then, for integration:
yarn workspace @crm/rabbitmq-lab-service test tests/integration
node scripts/architecture/check-rabbitmq-lab.mjs         # or: yarn check:rabbitmq-lab
```

## LAB-06/07 tests (not current)

**PLANNED — NOT IMPLEMENTED YET**

| Scenario | Expected |
| -------- | -------- |
| Retry tier progression | message moves through `student.rabbitmq-lab.retry.{5s,30s,5m}.q` → parking |
| Replay | parked event safely redelivered after fix |
| Duplicate event | `processed_events` (lab schema) prevents double side effect |
| Inbox rollback | business effect + `processed_events` insert roll back together on error |
