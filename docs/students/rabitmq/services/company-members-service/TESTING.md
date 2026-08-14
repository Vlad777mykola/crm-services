# company-members-service — Testing

| Scenario | Expected |
| -------- | -------- |
| `company.created` | owner member + optional outbox for `company-member.added` |
| Duplicate `company.created` | idempotent skip |
| Publish member.removed | auth projection updated |
