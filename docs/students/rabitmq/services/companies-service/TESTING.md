# companies-service — Testing

| Scenario | Expected |
| -------- | -------- |
| Create company | outbox row → `company.created` on broker |
| Duplicate insight event | no duplicate projection |
| Handler failure | NACK → `companies.dead.q` |

`yarn test` in `services/companies-service/`.
