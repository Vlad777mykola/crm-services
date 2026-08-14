# reviews-service — Student Guide

**CURRENT VERIFIED**

Submitting a review writes `review.received` to outbox. AI and notifications react asynchronously.

Trace: review HTTP → outbox → `domain.events` → `ai-service` + `notifications-service`.
