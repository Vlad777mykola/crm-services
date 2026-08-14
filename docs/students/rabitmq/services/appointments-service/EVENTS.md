# appointments-service — Events

## Publish (all `domain.events`, routing key = type)

`appointment.requested`, `appointment.approved`, `appointment.rejected`, `appointment.completed`, `appointment.cancelled`

## Consume

| Event | Exchange | Handler area |
| ----- | -------- | ------------ |
| `company.created` | `domain.events` | `handlers/projection-events.ts` |
| `company.updated` | `domain.events` | projections |
| `company-member.added` | `domain.events` | projections |
| `company-member.removed` | `domain.events` | projections |
| `service.created` | `domain.events` | projections |
| `service.updated` | `domain.events` | projections |
| `specialist-service.assigned` | `domain.events` | projections |
| `specialist-service.removed` | `domain.events` | projections |
| `ai.appointment_recommendation_created` | `analytics.events` | recommendation projections |

Queue: `appointments-service.q`
