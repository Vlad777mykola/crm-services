# Lesson 11 — ACK, NACK, Reject

## Status

**CURRENT VERIFIED**

## 1. Goal

See every outcome a handler can produce, and what RabbitMQ does with the
message in each case.

## 2. What problem are we solving?

A message isn't "done" until it's acknowledged. Understanding exactly when
and how to ACK/NACK/reject is the difference between reliable processing and
silent message loss or infinite redelivery loops.

## 3. Mental model

```text
RabbitMQ → delivery → handler runs → outcome:
  ack                  → removed from queue
  nack(requeue=false)  → dropped (no DLX configured yet in this lab)
  nack(requeue=true)   → redelivered immediately
  reject(requeue=false) → dropped, same effect as nack(requeue=false)
```

## 4. Diagram

```text
POST /api/lab/work {count:1, failMode:"nack-requeue"}
     │
     ▼
worker picks it up → nack(requeue=true) → back on the queue → picked up again
     (repeat forever if failMode never changes - see the warning below)
```

## 5. RabbitMQ terminology

`basic.ack`, `basic.nack`, `basic.reject`, `requeue` flag.

## 6. Existing code example

```45:75:services/rabbitmq-lab-service/src/labs/work-queue/index.ts
  switch (failMode) {
    case 'nack-requeue':
      ch.nack(msg, false, true);
      ...
      return; // not "processed" - RabbitMQ will redeliver it
    case 'nack-no-requeue':
      ch.nack(msg, false, false);
      ...
    case 'reject':
      ch.reject(msg, false);
      ...
    case 'ack':
    default:
      ch.ack(msg);
```

## 7. Exercise

Publish one job with each `failMode` and observe the outcome recorded per
worker.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/work -H "Content-Type: application/json" -d '{"count":1,"failMode":"ack"}'
curl -X POST http://localhost:4011/api/lab/work -H "Content-Type: application/json" -d '{"count":1,"failMode":"nack-no-requeue"}'
curl -X POST http://localhost:4011/api/lab/work -H "Content-Type: application/json" -d '{"count":1,"failMode":"reject"}'
```

## 10. What you should observe

`workQueue.workers.<A|B>.history` records the exact outcome string
(`"ack"`, `"nack(requeue=false)"`, `"reject(requeue=false)"`) for each job.

## 11. RabbitMQ Management UI steps

Queues → `student.rabbitmq-lab.work.q` → watch `Unacked` blip up to 1 while
a job is being "processed" (the 200ms simulated delay) then drop.

## 12. Logs you should see

```text
[rabbitmq-lab-service] work queue job handled
```

## 13. Expected queue state

For `ack`/`nack-no-requeue`/`reject`: `Ready` returns to `0`. There is no
dead-letter queue configured for `student.rabbitmq-lab.work.q` yet, so
`nack`/`reject` without requeue simply **drops** the message — Lesson
15/16 (retry/DLX/parking, not written yet) is where dropped messages
instead go somewhere inspectable.

## 14. Failure exercise — the loop trap

```powershell
curl -X POST http://localhost:4011/api/lab/work -H "Content-Type: application/json" -d '{"count":1,"failMode":"nack-requeue"}'
```

Watch `workQueue.workers.A.history` (or B) grow rapidly with
`"nack(requeue=true)"` entries for the *same* job — this is the **poison
message trap**: an immediate `nack(requeue=true)` on a message that will
never succeed retries forever, consuming CPU and filling logs. **Do not do
this in real code.** Stop the lab (`Ctrl+C`) to end the loop; there's no API
to cancel an individual redelivering message.

## 15. Cleanup/reset

Purge `student.rabbitmq-lab.work.q` from the Management UI after the loop
exercise.

## 16. Questions

1. Why is `nack(requeue=false)` different from `reject(requeue=false)` in
   the API, even though the effect here is identical?
2. Why does this lab have no automatic protection against the
   `nack-requeue` infinite loop?

## 17. How CRM uses this concept

Every real CRM consumer ACKs only after a successful DB commit, and NACKs
without requeue on failure — see
[docs/students/rabitmq/README.md](../README.md) §15–§17. Real services never
use `nack(requeue=true)` for this exact reason.

## 18. Production note

The CRM's target retry architecture (RFC1) deliberately uses **delayed
retry queues and parking** instead of `nack(requeue=true)` — see
[docs/students/rabitmq/common/18-rfc1-target.md](../common/18-rfc1-target.md).
This lab's LAB-06 phase (not implemented yet) will build the lab-namespaced
equivalent.

## Next

[12-prefetch-and-workers.md](./12-prefetch-and-workers.md)
