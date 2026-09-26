# Backend Architecture

## Rules

- MUST keep service boundaries independent.
- MUST NOT import source code across deployable services.
- MUST communicate between services through REST contracts or versioned events.
- MUST validate inbound HTTP and event payloads with Zod or a service-approved schema.
- MUST keep database ownership inside the owning service/schema.
- MUST use TypeORM repositories for database access in Node services unless the service already uses a different local pattern.
- MUST publish integration events through the transactional outbox.
- MUST consume RabbitMQ events idempotently using `processed_events` or the service's existing idempotency mechanism.
- MUST keep event schemas in `contracts/events`.
- MUST keep REST contracts in `contracts/openapi`.

## Service Responsibilities

- Routes/controllers handle HTTP boundaries.
- Application services/handlers own use-case orchestration.
- Repositories own persistence access.
- Consumers own event boundary handling and idempotency.
- Outbox publishers own publishing pending outbox rows to RabbitMQ.
