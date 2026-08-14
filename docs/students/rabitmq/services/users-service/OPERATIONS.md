# users-service — Operations Guide

## Development

| Resource | Value |
| -------- | ----- |
| Queue | `users-service.q` |
| Dead queue | `users.dead.q` |

## Production

Monitor queue depth and dead letters. No outbox publisher for this schema (publish path unused).
