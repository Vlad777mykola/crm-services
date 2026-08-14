# companies-service — Events

## Publish

| Event | Exchange | Routing key | Outbox |
| ----- | -------- | ----------- | ------ |
| `company.created` | `domain.events` | `company.created` | yes |
| `company.updated` | `domain.events` | `company.updated` | yes |

## Consume

| Event | Queue | Exchange | Handler |
| ----- | ----- | -------- | ------- |
| `ai.company_insight_created` | `companies-service.q` | `analytics.events` | `ai-company-insight-created.ts` |

Contracts: [`company.created.v1.json`](../../../../../contracts/events/company.created.v1.json), [`ai.company_insight_created.v1.json`](../../../../../contracts/events/ai.company_insight_created.v1.json)
