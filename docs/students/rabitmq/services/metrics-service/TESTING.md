# metrics-service — Testing

| Scenario | Expected |
| -------- | -------- |
| Any domain event | counter incremented |
| Handler/store failure | NACK, message dropped (no DLX) |

`store.test.ts` — unit tests for in-memory store.
