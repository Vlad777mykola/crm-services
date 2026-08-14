/**
 * Requires a running broker: `yarn dev:infra` (or the test stack) first.
 * Not run by `yarn test:unit` - see docs/students/rabitmq/lab-service/
 * lesson docs and the repo's `yarn test:integration` / `yarn test:messaging`
 * scripts for how broker-backed tests are wired into CI.
 */
import amqp, { type ChannelModel } from 'amqplib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createChannel } from '../../src/rabbitmq/channel.js';
import { getHelloState, HELLO_QUEUE, initHelloLab, publishHello } from '../../src/labs/hello/index.js';
import { declareCoreStudentTopology } from '../../src/rabbitmq/topology.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://crm:crm_local_only@localhost:5672/crm-dev';

describe('hello lab (default exchange round-trip)', () => {
  let connection: ChannelModel;

  beforeAll(async () => {
    connection = await amqp.connect(RABBITMQ_URL);
  });

  afterAll(async () => {
    await connection.close();
  });

  it('delivers a published message back to the same lab-owned queue', async () => {
    const channel = await createChannel(connection);
    await declareCoreStudentTopology(channel);
    await channel.deleteQueue(HELLO_QUEUE).catch(() => {});

    await initHelloLab(channel);
    await publishHello('integration-test-message');

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(getHelloState().received.some((entry) => entry.message === 'integration-test-message')).toBe(true);
  });
});
