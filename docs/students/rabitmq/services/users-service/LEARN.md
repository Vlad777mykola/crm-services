# users-service — Student Guide

## Status

**CURRENT VERIFIED**

## What does this service do?

Stores user profiles linked to auth identities.

## Why messaging?

When auth registers a user, this service must create a profile without auth making a blocking HTTP call.

## Follow one message

```text
auth.user_registered
  → users-service.q
  → processed_events check
  → insert user + profile
  → ACK
```

## Duplicate delivery

Same `event_id` twice → second delivery skipped via `processed_events`.

## Failure

Handler error → rollback → `users.dead.q`.

## Exercises

1. Find binding for `auth.user_registered` in topology.
2. Find JSON schema for payload.
3. Find where ACK happens in consumer.

## Next

[appointments-service](../appointments-service/LEARN.md) for a multi-consumer event.
