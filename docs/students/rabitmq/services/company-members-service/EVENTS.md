# company-members-service — Events

## Publish

| Event | Exchange | Routing key |
| ----- | -------- | ----------- |
| `company-member.added` | `domain.events` | `company-member.added` |
| `company-member.removed` | `domain.events` | `company-member.removed` |

## Consume

| Event | Queue | Binding |
| ----- | ----- | ------- |
| `company.created` | `company-members-service.q` | `domain.events` / `company.created` |

Note: `company-member.role_changed` schema exists but is **not published**.
