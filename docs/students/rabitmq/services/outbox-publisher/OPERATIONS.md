# outbox-publisher — Operations

Monitor per-schema:

- pending row count
- failed rows
- `outbox.dead.q` depth

Health: `HEALTH_PORT` HTTP server.

Production: publisher confirms required; credentials from secrets.
