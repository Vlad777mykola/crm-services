# specialists-service — Student Guide

**CURRENT VERIFIED**

This service **publishes** specialist facts via outbox but does **not** run a RabbitMQ consumer. Another service (`outbox-publisher-specialists`) delivers messages to the broker.

**Exercise:** Find where `specialist.created` is written to outbox in `specialists.service.ts`.

**Note:** `appointments-service` does not currently bind `specialist.created` / `specialist.updated` (verified gap).
