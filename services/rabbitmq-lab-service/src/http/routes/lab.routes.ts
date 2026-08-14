import type { IncomingMessage, ServerResponse } from 'node:http';

import { getLabChannel, getLabPool } from '../../lab-context.js';
import { isDatabaseReady, isRabbitMqReady } from '../../health/state.js';
import { getCompaniesObserverState } from '../../labs/companies-observer/index.js';
import { getConfirmsState, publishWithConfirm } from '../../labs/confirms/index.js';
import { getDirectState, isDirectColor, publishDirect } from '../../labs/direct/index.js';
import { getDlqState, publishDlqFailure } from '../../labs/dlq/index.js';
import { getFanoutState, publishFanout } from '../../labs/fanout/index.js';
import { getHeadersState, publishHeaders } from '../../labs/headers/index.js';
import { getHelloState, publishHello } from '../../labs/hello/index.js';
import {
  createTestIdempotencyEvent,
  getIdempotencyState,
  publishIdempotencyEvent,
} from '../../labs/idempotency/index.js';
import { createOrderWithOutbox, getOutboxState } from '../../labs/outbox/index.js';
import { resetStudentLabQueues } from '../../labs/reset/index.js';
import { getRetryState, publishRetryJob } from '../../labs/retry/index.js';
import { callRpc, getRpcState } from '../../labs/rpc/index.js';
import { getTopicState, publishTopic } from '../../labs/topic/index.js';
import {
  cancelWorker,
  getWorkQueueState,
  peekOneJobViaBasicGet,
  publishWork,
  restartWorker,
  type FailMode,
  type WorkerName,
} from '../../labs/work-queue/index.js';
import { STUDENT_NAMESPACE_PREFIX } from '../../rabbitmq/names.js';

const FAIL_MODES: FailMode[] = ['ack', 'nack-requeue', 'nack-no-requeue', 'reject', 'throw'];
const WORKER_NAMES: WorkerName[] = ['A', 'B'];

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readBody(req);
  if (raw.length === 0) return {};
  const parsed = JSON.parse(raw) as unknown;
  return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export async function handleStatus(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pool = getLabPool();
  sendJson(res, 200, {
      service: 'rabbitmq-lab-service',
      rabbitmqReady: isRabbitMqReady(),
      databaseReady: isDatabaseReady(),
      studentNamespace: STUDENT_NAMESPACE_PREFIX,
      labs: [
        'hello',
        'direct',
        'topic',
        'fanout',
        'headers',
        'workQueue',
        'confirms',
        'dlq',
        'retry',
        'rpc',
        'companiesObserver',
        'idempotency',
        'outbox',
      ],
      hello: getHelloState(),
      direct: getDirectState(),
      topic: getTopicState(),
      fanout: getFanoutState(),
      headers: getHeadersState(),
      workQueue: getWorkQueueState(),
      confirms: getConfirmsState(),
      dlq: getDlqState(),
      retry: getRetryState(),
      rpc: getRpcState(),
      companiesObserver: getCompaniesObserverState(),
      idempotency: pool ? await getIdempotencyState(pool) : null,
      outbox: pool ? await getOutboxState(pool) : null,
  });
}

export async function handleMessages(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pool = getLabPool();
  sendJson(res, 200, {
    hello: getHelloState(),
    direct: getDirectState(),
    topic: getTopicState(),
    fanout: getFanoutState(),
    headers: getHeadersState(),
    workQueue: getWorkQueueState(),
    confirms: getConfirmsState(),
    dlq: getDlqState(),
    retry: getRetryState(),
    rpc: getRpcState(),
    companiesObserver: getCompaniesObserverState(),
    idempotency: pool ? await getIdempotencyState(pool) : null,
    outbox: pool ? await getOutboxState(pool) : null,
  });
}

export async function handleHello(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const requested = body.message;
    const message = typeof requested === 'string' && requested.length > 0 ? requested : 'hello from the RabbitMQ lab';
    await publishHello(message);
    sendJson(res, 202, { published: true, message });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleDirect(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const color = body.color;
    if (typeof color !== 'string' || !isDirectColor(color)) {
      sendJson(res, 400, { error: 'color must be one of: red, blue, green' });
      return;
    }
    publishDirect(color, body.payload ?? { color });
    sendJson(res, 202, { published: true, color });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleTopic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const routingKey = body.routingKey;
    if (typeof routingKey !== 'string' || routingKey.length === 0) {
      sendJson(res, 400, { error: 'routingKey is required' });
      return;
    }
    publishTopic(routingKey, body.payload ?? { routingKey });
    sendJson(res, 202, { published: true, routingKey });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleFanout(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    publishFanout(body.payload ?? { broadcast: true });
    sendJson(res, 202, { published: true });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleHeaders(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const headers = body.headers;
    if (typeof headers !== 'object' || headers === null) {
      sendJson(res, 400, { error: 'headers object is required' });
      return;
    }
    publishHeaders(headers as Record<string, unknown>, body.payload ?? { headers });
    sendJson(res, 202, { published: true, headers });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleWork(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const count = typeof body.count === 'number' && body.count > 0 ? Math.min(body.count, 100) : 10;
    const failMode =
      typeof body.failMode === 'string' && FAIL_MODES.includes(body.failMode as FailMode)
        ? (body.failMode as FailMode)
        : undefined;
    const ids = publishWork(count, failMode);
    sendJson(res, 202, { published: true, ids, failMode: failMode ?? 'ack' });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleWorkCancel(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const worker = body.worker;
    if (typeof worker !== 'string' || !WORKER_NAMES.includes(worker as WorkerName)) {
      sendJson(res, 400, { error: 'worker must be "A" or "B"' });
      return;
    }
    await cancelWorker(worker as WorkerName);
    sendJson(res, 200, { cancelled: worker });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleWorkRestart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const worker = body.worker;
    if (typeof worker !== 'string' || !WORKER_NAMES.includes(worker as WorkerName)) {
      sendJson(res, 400, { error: 'worker must be "A" or "B"' });
      return;
    }
    await restartWorker(worker as WorkerName);
    sendJson(res, 200, { restarted: worker });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleWorkPeek(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    sendJson(res, 200, await peekOneJobViaBasicGet());
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleConfirms(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const routingKey =
      typeof body.routingKey === 'string' && body.routingKey.length > 0 ? body.routingKey : 'confirmed';
    const record = await publishWithConfirm(routingKey, body.payload ?? { routingKey }, { mandatory: body.mandatory === true });
    sendJson(res, 202, record);
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleFailure(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    publishDlqFailure(body.payload ?? { reason: 'deliberate reject' });
    sendJson(res, 202, { published: true });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleRetry(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const failUntilAttempt = typeof body.failUntilAttempt === 'number' ? body.failUntilAttempt : 2;
    publishRetryJob(failUntilAttempt, typeof body.note === 'string' ? body.note : undefined);
    sendJson(res, 202, { published: true, failUntilAttempt });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleRpc(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const action = typeof body.action === 'string' ? body.action : 'ping';
    const response = await callRpc(action, body.payload);
    sendJson(res, 200, response);
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleOrder(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const pool = getLabPool();
    if (!pool) {
      sendJson(res, 503, { error: 'database not ready' });
      return;
    }
    const body = await readJsonBody(req);
    const item = typeof body.item === 'string' && body.item.length > 0 ? body.item : 'lab textbook';
    const result = await createOrderWithOutbox(pool, item);
    sendJson(res, 201, result);
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleIdempotency(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await readJsonBody(req);
    const event =
      typeof body.eventId === 'string'
        ? {
            eventId: body.eventId,
            note: typeof body.note === 'string' ? body.note : 'duplicate test',
            failAfterMark: body.failAfterMark === true,
          }
        : createTestIdempotencyEvent(
            typeof body.note === 'string' ? body.note : 'idempotency exercise',
            body.failAfterMark === true,
          );
    publishIdempotencyEvent(event);
    sendJson(res, 202, { published: true, event });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}

export async function handleReset(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const channel = getLabChannel();
    if (!channel) {
      sendJson(res, 503, { error: 'rabbitmq not ready' });
      return;
    }
    const result = await resetStudentLabQueues(channel);
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'bad request' });
  }
}
