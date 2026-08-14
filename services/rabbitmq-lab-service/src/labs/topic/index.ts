import type { Channel } from 'amqplib';

import { assertStudentQueue, bindStudentQueue } from '../../rabbitmq/channel.js';
import { consumeStudentQueue } from '../../rabbitmq/consumer.js';
import { studentName } from '../../rabbitmq/names.js';
import { publishToStudentExchange } from '../../rabbitmq/publisher.js';
import { STUDENT_TOPIC_EXCHANGE } from '../../rabbitmq/topology.js';
import { createHistory, type History } from '../shared/history.js';

/**
 * Lesson 09 - topic exchange: pattern routing with `*` (one segment) and `#`
 * (zero or more segments). This is the exact shape `domain.events` uses in
 * the real CRM - see docs/students/rabitmq/lab-service/09-topic-routing.md.
 */
interface TopicBinding {
  name: string;
  queue: string;
  pattern: string;
}

export const TOPIC_BINDINGS: TopicBinding[] = [
  { name: 'company', queue: studentName('topic', 'company', 'q'), pattern: 'company.*' },
  { name: 'created', queue: studentName('topic', 'created', 'q'), pattern: '*.created' },
  { name: 'all', queue: studentName('topic', 'all', 'q'), pattern: '#' },
];

const histories = new Map<string, History<unknown>>(TOPIC_BINDINGS.map((b) => [b.name, createHistory()]));

let channel: Channel | null = null;

export async function initTopicLab(ch: Channel): Promise<void> {
  channel = ch;
  for (const binding of TOPIC_BINDINGS) {
    await assertStudentQueue(ch, binding.queue, { durable: true });
    await bindStudentQueue(ch, binding.queue, STUDENT_TOPIC_EXCHANGE, binding.pattern);
    await consumeStudentQueue(ch, binding.queue, async (parsedBody) => {
      histories.get(binding.name)?.record(parsedBody);
    });
  }
}

/** routingKey is student-chosen, e.g. "company.created", "appointment.created". */
export function publishTopic(routingKey: string, payload: unknown): void {
  if (!channel) throw new Error('Topic lab is not connected yet - wait for /health/ready');
  publishToStudentExchange(channel, STUDENT_TOPIC_EXCHANGE, routingKey, payload);
}

export function getTopicState() {
  return TOPIC_BINDINGS.map((binding) => ({
    name: binding.name,
    queue: binding.queue,
    pattern: binding.pattern,
    received: histories.get(binding.name)?.list() ?? [],
  }));
}
