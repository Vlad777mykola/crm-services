import type { Channel } from 'amqplib';

import { logger } from '../../logger.js';
import { listStudentQueues } from '../registry.js';

/** Purge only student-namespaced durable queues - never CRM topology. */
export async function resetStudentLabQueues(channel: Channel): Promise<{ purged: string[] }> {
  const purged: string[] = [];
  for (const queue of listStudentQueues()) {
    try {
      await channel.purgeQueue(queue);
      purged.push(queue);
    } catch (err) {
      logger.warn({ err, queue }, '[rabbitmq-lab-service] reset: could not purge queue');
    }
  }
  return { purged };
}
