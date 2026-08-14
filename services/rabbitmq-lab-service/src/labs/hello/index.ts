import type { Channel } from 'amqplib';

import { logger } from '../../logger.js';
import { assertStudentQueue } from '../../rabbitmq/channel.js';
import { consumeStudentQueue } from '../../rabbitmq/consumer.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToDefaultExchange } from '../../rabbitmq/publisher.js';

/**
 * Lesson "Default exchange" / "Publish and subscribe" - the smallest
 * possible RabbitMQ example: one queue, no exchange declaration at all
 * (exchange=""), one publisher, one long-lived consumer.
 *
 * See docs/students/rabitmq/lab-service/05-publish-and-subscribe.md.
 */
export const HELLO_QUEUE = studentName('hello.q');

export interface HelloMessageRecord {
  message: string;
  receivedAt: string;
}

interface HelloState {
  received: HelloMessageRecord[];
}

const MAX_HISTORY = 20;
const state: HelloState = { received: [] };

let publishChannel: Channel | null = null;

export async function initHelloLab(channel: Channel): Promise<void> {
  await assertStudentQueue(channel, HELLO_QUEUE, { durable: true });
  publishChannel = channel;
  await consumeStudentQueue(channel, HELLO_QUEUE, async (parsedBody) => {
    const message = readMessage(parsedBody);
    state.received = [{ message, receivedAt: new Date().toISOString() }, ...state.received].slice(0, MAX_HISTORY);
    logger.info({ message }, '[rabbitmq-lab-service] hello lab received message');
  });
}

export async function publishHello(message: string): Promise<void> {
  if (!publishChannel) {
    throw new Error('Hello lab is not connected to RabbitMQ yet - wait for /health/ready to report ok');
  }
  publishToDefaultExchange(publishChannel, HELLO_QUEUE, { message, sentAt: new Date().toISOString() });
}

export function getHelloState(): HelloState {
  return state;
}

function readMessage(parsedBody: unknown): string {
  if (typeof parsedBody === 'object' && parsedBody !== null && 'message' in parsedBody) {
    const value = (parsedBody as { message: unknown }).message;
    if (typeof value === 'string') return value;
  }
  return JSON.stringify(parsedBody);
}
