import type { Channel } from 'amqplib';
import { randomUUID } from 'node:crypto';

import { logger } from '../../logger.js';
import { assertStudentQueue } from '../../rabbitmq/channel.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToDefaultExchange } from '../../rabbitmq/publisher.js';
import { createHistory } from '../shared/history.js';

/**
 * Lesson 19 - RPC over RabbitMQ (educational only, not CRM's default pattern).
 * See docs/students/rabitmq/lab-service/19-rpc.md.
 */
export const RPC_REQUEST_QUEUE = studentName('rpc.request.q');

interface RpcRequest {
  action: string;
  payload?: unknown;
}

interface RpcResponse {
  correlationId: string;
  result: unknown;
}

const requestHistory = createHistory<RpcRequest>();
const responseHistory = createHistory<RpcResponse>();

let channel: Channel | null = null;

export async function initRpcLab(ch: Channel): Promise<void> {
  channel = ch;
  await assertStudentQueue(ch, RPC_REQUEST_QUEUE, { durable: true });
  await ch.prefetch(1);
  await ch.consume(RPC_REQUEST_QUEUE, (msg) => {
    if (!msg) return;
    try {
      const request = JSON.parse(msg.content.toString('utf8')) as RpcRequest;
      requestHistory.record(request);
      const replyTo = msg.properties.replyTo;
      const correlationId = msg.properties.correlationId;
      if (!replyTo || !correlationId) {
        ch.ack(msg);
        return;
      }
      const response: RpcResponse = {
        correlationId,
        result: { echo: request.payload ?? request.action, at: new Date().toISOString() },
      };
      ch.sendToQueue(replyTo, Buffer.from(JSON.stringify(response)), {
        contentType: 'application/json',
        correlationId,
      });
      responseHistory.record(response);
      ch.ack(msg);
    } catch (err) {
      logger.error({ err }, '[rabbitmq-lab-service] rpc server handler failed');
      ch.nack(msg, false, false);
    }
  });
}

export async function callRpc(action: string, payload?: unknown): Promise<RpcResponse> {
  if (!channel) throw new Error('RPC lab is not connected yet - wait for /health/ready');
  const correlationId = randomUUID();
  const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });

  return new Promise<RpcResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('RPC timed out after 5s'));
    }, 5000);

    void channel!
      .consume(
        replyQueue,
        (msg) => {
          if (!msg || msg.properties.correlationId !== correlationId) return;
          clearTimeout(timeout);
          const parsed = JSON.parse(msg.content.toString('utf8')) as RpcResponse;
          channel!.ack(msg);
          resolve(parsed);
        },
        { noAck: false },
      )
      .then(() => {
        publishToDefaultExchange(channel!, RPC_REQUEST_QUEUE, { action, payload }, {
          replyTo: replyQueue,
          correlationId,
        });
      })
      .catch(reject);
  });
}

export function getRpcState() {
  return {
    requestQueue: RPC_REQUEST_QUEUE,
    requests: requestHistory.list(),
    responses: responseHistory.list(),
  };
}
