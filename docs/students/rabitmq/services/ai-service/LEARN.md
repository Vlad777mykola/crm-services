# ai-service — Student Guide

**CURRENT VERIFIED**

Example C trace:

```text
review.received → ai-service → analytics.company_rating_updated
  → notifications-service, metrics-service
```

**MESSAGING_MODE:** default `direct` publishes after DB commit in handler; `outbox` uses `ai_schema.outbox_events`.

**Duplicate:** `processed_events` with `consumer_name='ai-service'`.
