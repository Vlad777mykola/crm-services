# outbox-publisher — Student Guide

**CURRENT VERIFIED**

Bridge between database and broker. Trace Example A step 3:

```text
auth_schema.outbox_events (pending)
  → outbox-publisher-auth
  → domain.events / auth.user_registered
```

**Exercise:** Read `poll-and-publish.ts` — what happens after `MAX_ATTEMPTS`?
