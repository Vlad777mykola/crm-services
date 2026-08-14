import amqp, { type ChannelModel } from 'amqplib';

import { logger } from '../logger.js';

const RECONNECT_MS = 1000;

export interface ManagedConnection {
  isConnected: () => boolean;
  getConnection: () => ChannelModel | null;
  close: () => Promise<void>;
}

export interface ManagedConnectionOptions {
  url: string;
  /** Runs once per successful TCP connect - open channel(s), declare topology, start consumers. */
  onConnect: (connection: ChannelModel) => Promise<void>;
  onDisconnect?: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The connection lifecycle from Lesson 1
 * (docs/students/rabitmq/lab-service/03-connections-and-channels.md):
 * application -> TCP connection -> RabbitMQ, plus automatic reconnect.
 *
 * Every RabbitMQ-connected service in this repo re-declares this pattern
 * independently (see services/metrics-service/src/rabbitmq/consumer.ts)
 * instead of sharing a package, so each stays deployable on its own - the
 * lab follows the same rule instead of hiding it behind a generic
 * MessageBus abstraction that would teach the wrong lesson.
 */
export async function connectManaged(options: ManagedConnectionOptions): Promise<ManagedConnection> {
  let connected = false;
  let closed = false;
  let connecting = false;
  let connection: ChannelModel | null = null;

  async function connectLoop(): Promise<void> {
    if (connecting || closed) return;
    connecting = true;
    while (!closed) {
      try {
        connection = await amqp.connect(options.url);
        connection.on('close', () => {
          connected = false;
          connection = null;
          options.onDisconnect?.();
          if (!closed) {
            logger.warn('[rabbitmq-lab-service] RabbitMQ disconnected - reconnecting');
            connecting = false;
            setTimeout(() => void connectLoop(), RECONNECT_MS);
          }
        });
        connection.on('error', (err: unknown) => {
          logger.warn({ err }, '[rabbitmq-lab-service] RabbitMQ connection error');
        });

        await options.onConnect(connection);
        connected = true;
        connecting = false;
        return;
      } catch (err) {
        connected = false;
        logger.warn({ err }, '[rabbitmq-lab-service] RabbitMQ connect failed - retrying');
        await sleep(RECONNECT_MS);
      }
    }
    connecting = false;
  }

  await connectLoop();

  return {
    isConnected: () => connected,
    getConnection: () => connection,
    close: async () => {
      closed = true;
      connected = false;
      if (connection) {
        await connection.close().catch(() => {});
      }
    },
  };
}
