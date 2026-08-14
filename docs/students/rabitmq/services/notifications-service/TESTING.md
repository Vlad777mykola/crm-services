# notifications-service — Testing

| Scenario | Expected |
| -------- | -------- |
| `appointment.requested` | `email_logs` row, ACK |
| Duplicate | no duplicate email log |
| Invalid payload | validation failure per handler |

`yarn test` includes `consumer.test.ts`.
