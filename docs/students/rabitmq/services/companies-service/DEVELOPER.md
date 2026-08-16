# companies-service — Developer Guide

Outbox: `src/outbox/outbox-repository.ts`. Consumer retry topology uses `sourceExchange: 'analytics.events'` for `ai.company_insight_created`.

## Consumer lifecycle

Same pattern as other Node consumers: `connectManaged`, `declareRetryTopology`, `handleConsumerFailure`, `isReady()` for health. See [common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md).

**Docker note:** imports `@crm/messaging-kit` — standalone per-service Docker build context may not resolve workspace package.

Add event: follow [14-add-new-event.md](../../common/14-add-new-event.md). Publisher: `outbox-publisher-companies`.
