# specialists-service — Testing

| Scenario | Expected |
| -------- | -------- |
| Create specialist | `specialists_schema.outbox_events` pending row |
| After publisher poll | message on `domain.events` / `specialist.created` |

No consumer tests in this service.
