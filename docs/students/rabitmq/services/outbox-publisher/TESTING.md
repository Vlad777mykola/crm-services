# outbox-publisher — Testing

| Scenario | Expected |
| -------- | -------- |
| Pending row | published, status=published |
| Broker down | attempts increment, retry scheduled |
| MAX_ATTEMPTS exceeded | status=failed |

`yarn test` in `services/outbox-publisher/`.
