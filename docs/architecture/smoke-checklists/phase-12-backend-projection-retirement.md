# Smoke Checklist — Phase 12 (backend-projection-service retirement)

Manual verification only. `backend-projection-service` no longer exists;
`appointments-service` and `companies-service` each took over one of its two
consumers.

## 1. Start the stack

```bash
cd services/appointments-service && yarn dev
cd services/companies-service && yarn dev
cd services/ai-service && python src/main.py
```

Confirm `services/companies-service/.env` has `RABBITMQ_URL` set (new in this
phase — `.env.example` already defaults it).

## 2. `ai.appointment_recommendation_created` → appointments-service

Trigger `appointment.requested` (see Phase 9 checklist — request an
appointment). ai-service consumes it and publishes
`ai.appointment_recommendation_created`. Confirm a row lands in
`appointments_schema.appointment_recommendation_projections`:

```sql
SELECT * FROM appointments_schema.appointment_recommendation_projections ORDER BY "createdAt" DESC LIMIT 5;
```

No HTTP route exposes this yet (matches legacy — it never did either), so
this is a database-only check.

## 3. `ai.company_insight_created` → companies-service

There's no confirmed producer trigger for this one from ai-service today
(it only publishes `ai.appointment_recommendation_created` and
`analytics.company_rating_updated` from real event handlers) — verify the
consumer wiring directly instead:

```txt
[check]
- companies-service logs show it connected to RabbitMQ and bound
  ai.company_insight_created on startup.
- companies-service's /health/ready returns 200 (confirms both DB and
  RabbitMQ connectivity - it now checks the consumer like every other
  consumer-owning service).
```

If you want an end-to-end check, publish a test message by hand to
`analytics.events` with routing key `ai.company_insight_created` matching
`contracts/events/ai.company_insight_created.v1.json`, then confirm a row
lands in `companies_schema.company_insight_projections`.

## 4. No leftover references

```txt
[check]
- Port 4400 is not bound by anything (`docker ps` has no
  backend-projection-service container).
- docker/dev/compose.services.yml and docker/prod/compose.yml have no
  backend-projection-service service block.
```

## Result

_Fill in after running the steps above._
