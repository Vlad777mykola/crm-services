import { CONFIRMS_QUEUE, CONFIRMS_EXCHANGE } from './confirms/index.js';
import { DIRECT_COLORS } from './direct/index.js';
import { FANOUT_QUEUES } from './fanout/index.js';
import { HEADERS_QUEUES } from './headers/index.js';
import { HELLO_QUEUE } from './hello/index.js';
import {
  DEAD_QUEUE,
  DLX_EXCHANGE,
  DLQ_SOURCE_QUEUE,
} from './dlq/index.js';
import { IDEMPOTENCY_QUEUE } from './idempotency/index.js';
import { RPC_REQUEST_QUEUE } from './rpc/index.js';
import { LAB_OUTBOX_EXCHANGE } from '../db/outbox-repository.js';
import {
  PARKING_EXCHANGE,
  PARKING_QUEUE,
  RETRY_SOURCE_EXCHANGE,
  RETRY_SOURCE_QUEUE,
  RETRY_TIER_LABELS,
  retryExchange,
  retryQueue,
} from './retry/topology.js';
import { TOPIC_BINDINGS } from './topic/index.js';
import { WORK_QUEUE } from './work-queue/index.js';
import {
  STUDENT_DIRECT_EXCHANGE,
  STUDENT_FANOUT_EXCHANGE,
  STUDENT_HEADERS_EXCHANGE,
  STUDENT_TOPIC_EXCHANGE,
} from '../rabbitmq/topology.js';

/** Every durable student exchange the lab declares - safe to delete on reset. */
export function listStudentExchanges(): string[] {
  return [
    STUDENT_DIRECT_EXCHANGE,
    STUDENT_TOPIC_EXCHANGE,
    STUDENT_FANOUT_EXCHANGE,
    STUDENT_HEADERS_EXCHANGE,
    CONFIRMS_EXCHANGE,
    DLX_EXCHANGE,
    RETRY_SOURCE_EXCHANGE,
    ...RETRY_TIER_LABELS.map((label) => retryExchange(label)),
    PARKING_EXCHANGE,
    LAB_OUTBOX_EXCHANGE,
  ];
}

/** Every durable student queue the lab owns - safe to purge on reset. */
export function listStudentQueues(): string[] {
  const directQueues = DIRECT_COLORS.map((color) => `student.rabbitmq-lab.direct.${color}.q`);
  return [
    HELLO_QUEUE,
    ...directQueues,
    ...TOPIC_BINDINGS.map((b) => b.queue),
    FANOUT_QUEUES.a,
    FANOUT_QUEUES.b,
    HEADERS_QUEUES.all,
    HEADERS_QUEUES.any,
    WORK_QUEUE,
    CONFIRMS_QUEUE,
    DLQ_SOURCE_QUEUE,
    DEAD_QUEUE,
    RETRY_SOURCE_QUEUE,
    ...RETRY_TIER_LABELS.map((label) => retryQueue(label)),
    PARKING_QUEUE,
    IDEMPOTENCY_QUEUE,
    RPC_REQUEST_QUEUE,
  ];
}
