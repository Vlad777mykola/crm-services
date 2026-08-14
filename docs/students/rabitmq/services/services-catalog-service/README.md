# services-catalog-service messaging

## Messaging status

**CURRENT VERIFIED** — publisher only

## Publishes

| Event | Exchange |
| ----- | -------- |
| `service.created` | `domain.events` |
| `service.updated` | `domain.events` |
| `specialist-service.assigned` | `domain.events` |
| `specialist-service.removed` | `domain.events` |

## Consumes

None.

## Outbox

`services_schema.outbox_events` · Publisher: `outbox-publisher-services`

## Consumers elsewhere

`appointments-service` binds all four for projections.

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
