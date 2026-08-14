# appointments-service — Testing

| Scenario | Expected |
| -------- | -------- |
| Request appointment | outbox + downstream notifications/ai/metrics |
| Projection event | projection row updated |
| Duplicate inbound | skip via processed_events |
| AI recommendation | `appointment_recommendation_projections` row |

`yarn test` in `services/appointments-service/`.
