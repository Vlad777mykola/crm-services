# companies-service — Student Guide

**CURRENT VERIFIED**

Publishes when companies are created/updated. Consumes AI insights to update `company_insight_projections`.

**Gap:** `ai.company_insight_created` is consumed here but no publisher found in ai-service source — verify before tracing end-to-end.

**Exercise:** Find outbox routing for `company.created`.
