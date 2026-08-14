# outbox-publisher — Developer Guide

Key files:

- `src/publisher/poll-and-publish.ts`
- `src/db/outbox-repository.ts`
- `src/rabbitmq/publisher.ts`

Uses `FOR UPDATE SKIP LOCKED`, publisher confirms, mandatory routing.

To add a new publishing schema: new compose service with `OUTBOX_SCHEMA` env — no code change if table shape matches.
