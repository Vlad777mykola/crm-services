# <service-name> — Developer Guide

## Status

CURRENT VERIFIED

## Code map

| Area | Path |
| ---- | ---- |
| Topology | |
| Consumer | |
| Publisher / outbox | |
| Handlers | |
| Idempotency | |
| Schema | |

## Publishing architecture

## Consumer architecture

## Repository/database transaction rules

## How to add a new published event

## How to add a consumed event

## How to add a handler

## How to change a binding

## How to change topology

## How to add an outbox event

## How to preserve correlationId

## How idempotency must work

## Error/retry rules

## What not to do

- ❌ RabbitMQ publish inside HTTP transaction path
- ❌ markProcessed using another DB connection
- ❌ ACK before DB commit
- ❌ business handler calling `channel.ack()`
- ❌ changing event payload without updating contract
- ❌ using a new routing key without documenting/testing binding
- ❌ silently swallowing handler errors
- ❌ assuming a message arrives once
- ❌ putting Kafka topic names in domain service logic

## Code review checklist

- [ ] Contract exists in `contracts/events/`
- [ ] Outbox row in same TX as business change
- [ ] Binding declared in topology
- [ ] Idempotency for new consumer handler
- [ ] Tests: valid, duplicate, failure
- [ ] Documentation updated (EVENTS.md, SERVICES.md)
