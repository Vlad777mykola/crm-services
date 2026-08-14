# ai-service — Testing

| Scenario | Expected |
| -------- | -------- |
| `appointment.requested` | recommendation published to analytics.events |
| `review.received` | rating event published |
| Duplicate | processed_events skip |

Verify test commands in ai-service README / pyproject.
