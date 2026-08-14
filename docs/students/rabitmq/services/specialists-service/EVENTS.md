# specialists-service — Events

## Publish

| Event | Exchange | Routing key | Outbox |
| ----- | -------- | ----------- | ------ |
| `specialist.created` | `domain.events` | `specialist.created` | yes |
| `specialist.updated` | `domain.events` | `specialist.updated` | yes |

## Consume

None.
