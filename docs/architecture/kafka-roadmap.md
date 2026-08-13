# Kafka roadmap (K1–K8)

Kafka is **not scheduled** until a real use case exists (replay, durable analytics history, cross-team integration).

## K1 Provision Kafka
- Dev: optional compose profile, not part of default startup
- Prod: managed cluster, TLS/auth, topic ACLs, monitoring

## K2 Add `KafkaSink`
Implement `EventSink` for `outbox_deliveries` → `KafkaSink` without domain changes.

## K3 Topic/key policy
Bounded-context streams (e.g. `crm.appointments.events.v1`). Partition keys per ordering requirement (`appointmentId`, `companyId`, `userId`).

## K4 `enabledFrom`
New events after activation receive Kafka delivery obligations; historical events do not auto-flood.

## K5 Explicit backfill
`messaging:delivery:backfill --sink kafka --event ... --since ...` (operator-controlled).

## K6 Shadow consumers
Read → validate → compare/metrics → **no business side effects**.

## K7 Kafka DB consumer semantics
`receive → BEGIN → processed_events → business effect → optional outbox → COMMIT → commit offset`

## K8 Migration order
Publish-only streams → users projections → appointments projections → metrics → notifications last.
