# notifications-service — Developer Guide

Consumer-only. Retry topology on both `domain.events` and `analytics.events`.

## Consumer lifecycle

`connectManaged` + dual `declareRetryTopology` calls + `handleConsumerFailure`. Readiness: `isReady()`.

Test reference: `src/rabbitmq/consumer.test.ts` (retry republish + channel-close recovery).

[common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md)
