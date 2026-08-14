# Lesson 12 — Prefetch and `basic.get`

## Status

**CURRENT VERIFIED**

## 1. Goal

Understand why `prefetch(1)` produces fair, round-robin-like distribution,
and why `basic.get` is not how a real consumer should work.

## 2. What problem are we solving?

Without a prefetch limit, a fast RabbitMQ broker can hand one consumer a
huge batch of messages before that consumer has finished any of them —
starving other, equally capable workers. `prefetch(1)` says "don't give me
another message until I've acked/nacked this one."

## 3. Mental model

```text
prefetch(1)  → each worker holds at most 1 unacked message at a time
              → RabbitMQ naturally load-balances across free workers

basic.get()  → poll for one message, right now, synchronously
              → no subscription, no ongoing delivery - fine for a quick
                test/demo, wrong for a real service's main loop
```

## 4. Diagram

```text
work-queue lab: prefetch(1) applied per-consumer (non-global qos, the default)
     A: 1 unacked max
     B: 1 unacked max
GET /api/lab/work/peek → channel.get() → one message, acked immediately, no consumer registered
```

## 5. RabbitMQ terminology

`basic.qos`, prefetch count, `global` flag, `basic.get`.

## 6. Existing code example

```95:104:services/rabbitmq-lab-service/src/labs/work-queue/index.ts
export async function peekOneJobViaBasicGet(): Promise<{ job: WorkJob | null }> {
  if (!channel) throw new Error('Work queue lab is not connected yet - wait for /health/ready');
  const msg = await channel.get(WORK_QUEUE);
  if (!msg) return { job: null };
  const job = JSON.parse(msg.content.toString('utf8')) as WorkJob;
  channel.ack(msg);
  return { job };
}
```

```66:69:services/rabbitmq-lab-service/src/labs/work-queue/index.ts
export async function initWorkQueueLab(ch: Channel): Promise<void> {
  channel = ch;
  await assertStudentQueue(ch, WORK_QUEUE, { durable: true });
  await ch.prefetch(1);
```

## 7. Exercise

Publish several jobs, then call the `basic.get` endpoint once and compare it
to what the long-lived workers are doing.

## 8. Start commands

```powershell
yarn dev:infra
yarn dev:rabbitmq-lab
```

## 9. Publish action

```powershell
curl -X POST http://localhost:4011/api/lab/work -H "Content-Type: application/json" -d '{"count":5}'
curl http://localhost:4011/api/lab/work/peek
```

## 10. What you should observe

The two long-lived workers (A/B) race to consume the 5 published jobs
automatically. `GET /api/lab/work/peek` only returns something if a job is
still sitting `Ready` at the exact instant you call it — it does not wait,
and it does not compete fairly with the long-lived consumers.

## 11. RabbitMQ Management UI steps

Queues → `student.rabbitmq-lab.work.q` → note there is no "poll" indicator
for `basic.get` calls — they don't show up as a consumer, unlike A/B.

## 12. Logs you should see

`peekOneJobViaBasicGet` has no dedicated log line — only the two long-lived
workers log `work queue job handled`.

## 13. Expected queue state

`Ready` drains quickly regardless of whether you call `/work/peek` — the two
long-lived consumers are doing the real work.

## 14. Failure exercise

Try changing `PROCESSING_MS` locally (in `src/labs/work-queue/index.ts`) to
a larger value, restart the service, publish 10 jobs, and watch `Ready`
drain much more slowly — this makes the prefetch-driven load balancing
between A and B visually obvious over a longer window.

## 15. Cleanup/reset

Purge `student.rabbitmq-lab.work.q` from the Management UI.

## 16. Questions

1. Why would `basic.get` in a hot loop be worse than a single long-lived
   `basic.consume` subscription?
2. If you set `prefetch(10)` instead of `prefetch(1)`, what would you expect
   to change about how jobs distribute between A and B?

## 17. How CRM uses this concept

Every real CRM consumer uses `prefetch(1)` today — see
[docs/students/rabitmq/README.md](../README.md) and each service's
`rabbitmq/consumer.ts`. `basic.get` does not appear anywhere in real
service code; RabbitMQ's own docs call it appropriate only for limited
cases such as tests.

## 18. Production note

`prefetch(1)` trades some throughput for fairness and safety (never more
than one in-flight message per worker to lose on a crash). Real services
could tune this higher once idempotency and monitoring are solid, but CRM
has not needed to yet.

## Next

Lesson "publisher confirms" — see
[START-HERE.md](./START-HERE.md#implementation-order) (LAB-05).
