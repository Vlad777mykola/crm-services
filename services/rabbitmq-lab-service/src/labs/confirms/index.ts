import type { Channel, ChannelModel, ConfirmChannel, Message } from 'amqplib';

import { assertStudentExchange, assertStudentQueue, bindStudentQueue } from '../../rabbitmq/channel.js';
import { consumeStudentQueue } from '../../rabbitmq/consumer.js';
import { studentName } from '../../rabbitmq/names.js';
import { createHistory, type History } from '../shared/history.js';

/**
 * Lesson 13 (publisher confirms) + Lesson 14 (mandatory/basic.return).
 *
 * `channel.publish()` returning `true` only means "the broker's socket
 * buffer accepted it locally" - NOT "the broker confirmed receipt" and NOT
 * "it was routable to a queue". Those are two separate guarantees, both
 * demonstrated here with a dedicated `ConfirmChannel`.
 *
 * See docs/students/rabitmq/lab-service/13-publisher-confirms.md and
 * 14-mandatory-and-unroutable.md.
 */
export const CONFIRMS_EXCHANGE = studentName('confirms');
export const CONFIRMS_QUEUE = studentName('confirms.q');
const BOUND_ROUTING_KEY = 'confirmed';

interface PublishRecord {
  routingKey: string;
  mandatory: boolean;
  confirmed: boolean;
}

interface ReturnedRecord {
  routingKey: string;
  payload: unknown;
}

const publishHistory: History<PublishRecord> = createHistory();
const returnedHistory: History<ReturnedRecord> = createHistory();
const receivedHistory: History<unknown> = createHistory();

let confirmChannel: ConfirmChannel | null = null;

function safeParseJson(content: Buffer): unknown {
  try {
    return JSON.parse(content.toString('utf8'));
  } catch {
    return content.toString('utf8');
  }
}

export async function initConfirmsLab(connection: ChannelModel, plainChannel: Channel): Promise<void> {
  await assertStudentExchange(plainChannel, CONFIRMS_EXCHANGE, { type: 'topic' });
  await assertStudentQueue(plainChannel, CONFIRMS_QUEUE, { durable: true });
  await bindStudentQueue(plainChannel, CONFIRMS_QUEUE, CONFIRMS_EXCHANGE, BOUND_ROUTING_KEY);
  await consumeStudentQueue(plainChannel, CONFIRMS_QUEUE, async (parsedBody) => {
    receivedHistory.record(parsedBody);
  });

  confirmChannel = await connection.createConfirmChannel();
  // Only fires when mandatory=true AND the message was unroutable (Lesson 14).
  confirmChannel.on('return', (msg: Message) => {
    returnedHistory.record({ routingKey: msg.fields.routingKey, payload: safeParseJson(msg.content) });
  });
}

export interface PublishWithConfirmOptions {
  mandatory?: boolean;
}

/**
 * Resolves only after the broker has ack'd the publish (Lesson 13). Rejects
 * if the broker nacks it. `mandatory: true` (Lesson 14) additionally causes
 * an unroutable message to come back via the `return` event above instead
 * of being silently dropped.
 */
export async function publishWithConfirm(
  routingKey: string,
  payload: unknown,
  options: PublishWithConfirmOptions = {},
): Promise<PublishRecord> {
  if (!confirmChannel) throw new Error('Confirms lab is not connected yet - wait for /health/ready');
  const mandatory = options.mandatory ?? false;
  const content = Buffer.from(JSON.stringify(payload));

  const record = await new Promise<PublishRecord>((resolve, reject) => {
    confirmChannel?.publish(
      CONFIRMS_EXCHANGE,
      routingKey,
      content,
      { contentType: 'application/json', mandatory },
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ routingKey, mandatory, confirmed: true });
      },
    );
  });

  publishHistory.record(record);
  return record;
}

export function getConfirmsState() {
  return {
    exchange: CONFIRMS_EXCHANGE,
    queue: CONFIRMS_QUEUE,
    boundRoutingKey: BOUND_ROUTING_KEY,
    published: publishHistory.list(),
    returned: returnedHistory.list(),
    received: receivedHistory.list(),
  };
}
