# notifications-service — Events

## Publish

None.

## Consume

| Event | Queue | Exchange | Handler |
| ----- | ----- | -------- | ------- |
| `appointment.requested` | `notifications-service.q` | `domain.events` | domain-events |
| `appointment.approved` | same | `domain.events` | domain-events |
| `appointment.rejected` | same | `domain.events` | domain-events |
| `appointment.cancelled` | same | `domain.events` | domain-events |
| `appointment.completed` | same | `domain.events` | domain-events |
| `review.received` | same | `domain.events` | domain-events |
| `analytics.company_rating_updated` | same | `analytics.events` | analytics-events |

Binding pattern: `appointment.*` on domain exchange.
