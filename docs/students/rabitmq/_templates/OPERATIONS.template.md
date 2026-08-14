# <service-name> — Operations Guide

## Status

CURRENT VERIFIED

## Development

### Queue names

### Exchange names

### Routing patterns

### How to check queue depth

Management UI: http://localhost:15672 (user `crm`, vhost `crm-dev`)

### How to identify stuck consumers

### Readiness behavior

### Useful log patterns

### How to inspect a failure

### Dev-only: reset queues

See `scripts/state/lib/messaging-reset.mjs` and `scripts/messaging/cli.mjs`.

## Production

**TARGET — production rules differ from local Docker.**

- Managed/clustered RabbitMQ, TLS, secret-managed credentials
- Per-environment vhost, least privilege
- Monitoring and alerts on queue depth and consumer lag
- No destructive queue resets

### Retry / parking queues

**TARGET RFC1 — NOT CURRENT** unless verified in topology for this service.

### What should cause an alert

### What not to change manually
