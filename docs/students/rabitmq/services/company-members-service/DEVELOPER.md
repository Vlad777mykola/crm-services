# company-members-service — Developer Guide

Publish + consume. Outbox: `src/outbox/outbox-repository.ts`. Handler: `handlers/company-created.ts`.

Publisher deployment: `outbox-publisher-company-members`.

## Consumer lifecycle

`connectManaged` + retry topology on `domain.events`. [common/22-connection-lifecycle.md](../../common/22-connection-lifecycle.md)
