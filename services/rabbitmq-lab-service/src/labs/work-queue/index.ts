import type { Channel, ConsumeMessage } from 'amqplib';

import { logger } from '../../logger.js';
import { assertStudentQueue } from '../../rabbitmq/channel.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToDefaultExchange } from '../../rabbitmq/publisher.js';
import { createHistory, type History } from '../shared/history.js';

/**
 * Lesson 06 - work queues / competing consumers, plus Lessons 11
 * (ACK/NACK/reject), 12 (prefetch), and the "basic.get is for tests/demos
 * only" note from Lesson 10. Uses `channel.consume`/`ack`/`nack`/`reject`
 * directly (not the guarded `consumeStudentQueue` wrapper) specifically so
 * students can see every outcome, not just success-or-drop.
 *
 * Two consumer tags on one channel is a single-process simplification for
 * this lab - real competing workers are separate processes/connections
 * (see docs/students/rabitmq/lab-service/06-work-queues.md). RabbitMQ's
 * non-global `basic.qos` (the default) still applies prefetch=1 per
 * consumer, so the round-robin behavior is real, not simulated.
 */
export const WORK_QUEUE = studentName('work.q');

export type FailMode = 'ack' | 'nack-requeue' | 'nack-no-requeue' | 'reject' | 'throw';
export type WorkerName = 'A' | 'B';

interface WorkJob {
  id: number;
  failMode?: FailMode;
}

interface WorkerStats {
  processed: number;
  history: History<{ id: number; outcome: string }>;
}

const PROCESSING_MS = 200;

const workers: Record<WorkerName, WorkerStats> = {
  A: { processed: 0, history: createHistory() },
  B: { processed: 0, history: createHistory() },
};

let channel: Channel | null = null;
const consumerTags: Record<WorkerName, string | null> = { A: null, B: null };
let nextJobId = 1;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processJob(ch: Channel, workerName: WorkerName, msg: ConsumeMessage): Promise<void> {
  const job = JSON.parse(msg.content.toString('utf8')) as WorkJob;
  await sleep(PROCESSING_MS); // simulated work - long enough to make round-robin visible
  const worker = workers[workerName];
  const failMode: FailMode = job.failMode ?? 'ack';

  switch (failMode) {
    case 'nack-requeue':
      // Lesson 12 warns against looping this forever on a poison message -
      // this demo path exists only to show the ACK/NACK/reject vocabulary.
      ch.nack(msg, false, true);
      worker.history.record({ id: job.id, outcome: 'nack(requeue=true)' });
      return; // not "processed" - RabbitMQ will redeliver it
    case 'nack-no-requeue':
      ch.nack(msg, false, false);
      worker.history.record({ id: job.id, outcome: 'nack(requeue=false)' });
      break;
    case 'reject':
      ch.reject(msg, false);
      worker.history.record({ id: job.id, outcome: 'reject(requeue=false)' });
      break;
    case 'throw':
      ch.nack(msg, false, false);
      worker.history.record({ id: job.id, outcome: 'handler threw -> nack(requeue=false)' });
      break;
    case 'ack':
    default:
      ch.ack(msg);
      worker.history.record({ id: job.id, outcome: 'ack' });
      break;
  }

  worker.processed += 1;
  logger.info({ worker: workerName, job: job.id, failMode }, '[rabbitmq-lab-service] work queue job handled');
}

async function startWorker(ch: Channel, name: WorkerName): Promise<void> {
  const { consumerTag } = await ch.consume(WORK_QUEUE, (msg) => {
    if (!msg) return;
    void processJob(ch, name, msg);
  });
  consumerTags[name] = consumerTag;
}

export async function initWorkQueueLab(ch: Channel): Promise<void> {
  channel = ch;
  await assertStudentQueue(ch, WORK_QUEUE, { durable: true });
  await ch.prefetch(1);
  await startWorker(ch, 'A');
  await startWorker(ch, 'B');
}

/** Lesson 15 (consumer cancel) - stop one worker and watch the other take everything. */
export async function cancelWorker(name: WorkerName): Promise<void> {
  if (!channel) throw new Error('Work queue lab is not connected yet - wait for /health/ready');
  const tag = consumerTags[name];
  if (!tag) return;
  await channel.cancel(tag);
  consumerTags[name] = null;
}

export async function restartWorker(name: WorkerName): Promise<void> {
  if (!channel) throw new Error('Work queue lab is not connected yet - wait for /health/ready');
  if (consumerTags[name]) return;
  await startWorker(channel, name);
}

export function publishWork(count: number, failMode?: FailMode): number[] {
  if (!channel) throw new Error('Work queue lab is not connected yet - wait for /health/ready');
  const ids: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = nextJobId;
    nextJobId += 1;
    ids.push(id);
    const job: WorkJob = { id, failMode };
    publishToDefaultExchange(channel, WORK_QUEUE, job);
  }
  return ids;
}

/**
 * Lesson 10 note - `basic.get` (polling) is for tests/demos only, never a
 * real consumer loop. Acks immediately so it doesn't interfere with the
 * two long-lived workers above.
 */
export async function peekOneJobViaBasicGet(): Promise<{ job: WorkJob | null }> {
  if (!channel) throw new Error('Work queue lab is not connected yet - wait for /health/ready');
  const msg = await channel.get(WORK_QUEUE);
  if (!msg) return { job: null };
  const job = JSON.parse(msg.content.toString('utf8')) as WorkJob;
  channel.ack(msg);
  return { job };
}

export function getWorkQueueState() {
  return {
    queue: WORK_QUEUE,
    workers: {
      A: { active: consumerTags.A !== null, processed: workers.A.processed, history: workers.A.history.list() },
      B: { active: consumerTags.B !== null, processed: workers.B.processed, history: workers.B.history.list() },
    },
  };
}
