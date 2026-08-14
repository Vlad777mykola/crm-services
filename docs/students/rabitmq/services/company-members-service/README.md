# company-members-service messaging

## Messaging status

**CURRENT VERIFIED**

## Service role

Company membership and invitations.

## Quick diagram

```text
company.created → company-members-service → (owner row + may emit company-member.added)
company-member.added/removed → domain.events → auth-service
```

## Publishes

`company-member.added`, `company-member.removed`

## Consumes

`company.created` (auto-creates owner; may publish `company-member.added` in same TX)

## Queue

`company-members-service.q` · Outbox: `company_members_schema` · Idempotency: yes

## Guides

[LEARN](./LEARN.md) · [EVENTS](./EVENTS.md) · [DEVELOPER](./DEVELOPER.md) · [TESTING](./TESTING.md) · [OPS](./OPERATIONS.md)
