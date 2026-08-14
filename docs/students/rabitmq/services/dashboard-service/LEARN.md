# dashboard-service — Student Guide

**CURRENT VERIFIED**

Not every microservice needs RabbitMQ. Dashboard reads data via HTTP/SQL — no asynchronous messaging.

**Learning value:** Understand **when not to add** a queue.

**Exercise:** Confirm `env.ts` has no `RABBITMQ_URL`.
