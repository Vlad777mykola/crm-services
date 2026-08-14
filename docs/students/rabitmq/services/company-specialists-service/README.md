# company-specialists-service messaging

## Messaging status

**CURRENT VERIFIED** — publisher only

## Publishes

`company-specialist.accepted` → `domain.events`

## Consumes

None.

## Outbox

`company_specialists_schema.outbox_events` · Publisher: `outbox-publisher-company-specialists`

## Note

`company-specialist.removed` schema exists; outbox routing comment says **not published**.

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
