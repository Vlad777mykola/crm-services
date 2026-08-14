# auth-service — Student Guide

## Status

**CURRENT VERIFIED**

## What does this service do?

Handles user registration, login, sessions. When someone registers, other services need to know — but auth should not block on them.

## Why does it participate in messaging?

Registration is a **fact** (`auth.user_registered`). Users-service reacts asynchronously. Membership changes from company-members-service update auth's projection for permissions.

## Events it publishes

`auth.user_registered` — a new identity exists.

## Events it consumes

`company-member.added`, `company-member.removed` — keep membership projection in sync.

## Follow one message — registration

```text
POST /auth/register
  → auth-service writes identity + outbox row (same TX)
  → outbox-publisher-auth
  → domain.events / auth.user_registered
  → users-service creates profile
```

Contract: [`contracts/events/auth.user_registered.v1.json`](../../../../../contracts/events/auth.user_registered.v1.json)

## Duplicate delivery

If `company-member.added` arrives twice with same `event_id`, `processed_events` prevents duplicate projection rows.

## Failure example

Handler throws → TX rollback → NACK → message in `auth.dead.q`.

## Exercise 1

Find the queue name in [`topology.ts`](../../../../../services/auth-service/src/rabbitmq/topology.ts).

## Exercise 2

Find where `auth.user_registered` is written to outbox in the registration flow.

## Questions

1. Why is outbox used instead of publishing in the HTTP handler?
2. What table prevents duplicate membership updates?
3. When does ACK happen?

## Where to look next

[`users-service` LEARN](../users-service/LEARN.md) — downstream consumer.
