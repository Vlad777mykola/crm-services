# metrics-service — Developer Guide

Do not add business side effects here. Observer only.

## Consumer lifecycle

Uses `connectManaged` from `@crm/messaging-kit` for reconnect/readiness (`isReady()`), but **not** retry topology — failures `nack(msg, false, false)`.

[common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md)

`store.test.ts` documents counter behavior.
