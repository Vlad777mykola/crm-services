# Lesson 06 — Work Queues (Competing Consumers)

## Status

**CURRENT VERIFIED**

## 1. Goal

Watch two workers split jobs from one queue — competing consumers, not
publish/subscribe.

## 2. What problem are we solving?

If ten jobs arrive and you have two workers, you want each job done exactly
once, by whichever worker is free — not both workers doing all ten.

## 3. Mental model

```text
publish 10 jobs → student.rabbitmq-lab.work.q
                       ├─ worker A (prefetch=1)
                       └─ worker B (prefetch=1)

roughly: job1→A, job2→B, job3→A, job4→B, ...
```

## 4. Diagram

```text
POST /api/lab/work {count:10}
     │
     ▼
student.rabbitmq-lab.work.q
     ├──► worker A (consumer tag 1)
     └──► worker B (consumer tag 2)
```

## 5. RabbitMQ terminology

Competing consumers, consumer tag, `channel.cancel()`.

## 6. Existing code example

```1:20:services/rabbitmq-lab-service/src/labs/work-queue/index.ts
export const WORK_QUEUE = studentName('work.q');
...
async function startWorker(ch: Channel, name: WorkerName): Promise<void> {
  const { consumerTag } = await ch.consume(WORK_QUEUE, (msg) => {
    if (!msg) return;
    void processJob(ch, name, msg);
  });
  consumerTags[name] = consumerTag;
}
```

Note: both workers here are two consumer tags on **one** shared channel, a
single-process simplification for this lab — real competing workers are
separate processes/connections. RabbitMQ's non-global `basic.qos` (the
default) still applies `prefetch(1)` **per consumer**, so the round-robin
behavior you'll see is real, not simulated.

## 7. Exercise

Publish 10 jobs and see them roughly split between A and B.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/work -H "Content-Type: application/json" -d '{"count":10}'
```

## 10. What you should observe

```powershell
curl http://localhost:4011/api/lab/status
```

`workQueue.workers.A.processed` and `workQueue.workers.B.processed` are
both roughly 5 (not exactly, since each job takes 200ms and delivery timing
isn't perfectly alternating — but neither worker should get all 10).

## 11. RabbitMQ Management UI steps

Queues → `student.rabbitmq-lab.work.q` → Consumers tab: two consumer tags
listed, each with its own prefetch/unacked count.

## 12. Logs you should see

```text
[rabbitmq-lab-service] work queue job handled
```
once per job, with `worker: "A"` or `worker: "B"`.

## 13. Expected queue state

`Ready` drains to `0` roughly every 200ms per free worker as jobs complete.

## 14. Failure exercise (consumer cancel)

```powershell
curl -X POST http://localhost:4011/api/lab/work/cancel -H "Content-Type: application/json" -d '{"worker":"B"}'
curl -X POST http://localhost:4011/api/lab/work -H "Content-Type: application/json" -d '{"count":6}'
```

All 6 new jobs go to worker A — check `workQueue.workers.B.active` is now
`false`. Restart B:

```powershell
curl -X POST http://localhost:4011/api/lab/work/restart -H "Content-Type: application/json" -d '{"worker":"B"}'
```

## 15. Cleanup/reset

Purge `student.rabbitmq-lab.work.q` from the Management UI.

## 16. Questions

1. What decides which worker gets the *next* job — is it round-robin by
   rule, or an effect of `prefetch(1)` plus whichever worker finishes first?
2. What happens to in-flight (unacked) jobs on a worker you cancel?

## 17. How CRM uses this concept

Every real consuming service could in principle run multiple instances for
the same queue to scale horizontally — RabbitMQ delivers competing-consumer
semantics automatically, no code change needed. See
[docs/students/rabitmq/common/12-operations.md](../common/12-operations.md).

## 18. Production note

Scaling a real consumer horizontally is exactly "start a second process
consuming the same queue" — no different from this lab's two workers, which
is exactly why the lab models it this way instead of a fake abstraction.

## Next

[11-ack-nack-reject.md](./11-ack-nack-reject.md)
