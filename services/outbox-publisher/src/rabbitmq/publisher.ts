import amqp, { type ChannelModel, type ConfirmChannel } from 'amqplib';

import { env } from '../env.js';
import { logger } from '../logger.js';
import { declareTopology } from './topology.js';

export type PublishFailureClass = 'confirm_nack' | 'unroutable' | 'connection_unavailable';

export interface PublishResult {
  ok: boolean;
  failureClass?: PublishFailureClass;
  error?: string;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export class RabbitMqPublisher {
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private connecting = false;
  private closed = false;
  private reconnectAttempt = 0;
  private returnedMessageIds = new Set<string>();

  async connect(): Promise<void> {
    await this.connectWithBackoff();
  }

  isConnected(): boolean {
    return this.channel !== null && this.connection !== null;
  }

  isReady(): boolean {
    return this.isConnected();
  }

  async publishConfirmed(
    eventId: string,
    exchange: string,
    routingKey: string,
    body: Buffer,
  ): Promise<PublishResult> {
    const channel = this.channel;
    if (!channel) {
      return { ok: false, failureClass: 'connection_unavailable', error: 'channel not available' };
    }

    return new Promise<PublishResult>((resolve) => {
      let settled = false;
      const settle = (result: PublishResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result);
      };

      const onReturn = (msg: amqp.Message): void => {
        if (msg.properties.messageId === eventId) {
          this.returnedMessageIds.add(eventId);
          settle({ ok: false, failureClass: 'unroutable', error: 'basic.return' });
        }
      };

      channel.once('return', onReturn);

      const published = channel.publish(
        exchange,
        routingKey,
        body,
        {
          contentType: 'application/json',
          persistent: true,
          mandatory: true,
          messageId: eventId,
        },
        (err) => {
          channel.removeListener('return', onReturn);
          if (settled) {
            return;
          }
          if (err) {
            settle({ ok: false, failureClass: 'confirm_nack', error: err.message });
            return;
          }
          if (this.returnedMessageIds.has(eventId)) {
            this.returnedMessageIds.delete(eventId);
            settle({ ok: false, failureClass: 'unroutable', error: 'basic.return' });
            return;
          }
          settle({ ok: true });
        },
      );

      if (!published) {
        channel.removeListener('return', onReturn);
        settle({ ok: false, failureClass: 'connection_unavailable', error: 'publish buffer full' });
      }
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
    this.channel = null;
    this.connection = null;
  }

  private async connectWithBackoff(): Promise<void> {
    if (this.connecting || this.closed) {
      return;
    }
    this.connecting = true;

    while (!this.closed) {
      try {
        this.connection = await amqp.connect(env.RABBITMQ_URL);
        this.reconnectAttempt = 0;

        this.connection.on('error', (err: unknown) => {
          logger.warn({ err }, '[outbox-publisher] RabbitMQ connection error');
        });
        this.connection.on('close', () => {
          this.channel = null;
          this.connection = null;
          if (!this.closed) {
            void this.scheduleReconnect();
          }
        });

        this.channel = await this.connection.createConfirmChannel();
        await declareTopology(this.channel);

        this.channel.on('return', (msg) => {
          const messageId = msg.properties.messageId;
          if (messageId) {
            this.returnedMessageIds.add(messageId);
          }
          logger.warn(
            { messageId, exchange: msg.fields.exchange, routingKey: msg.fields.routingKey },
            '[outbox-publisher] unroutable message returned',
          );
        });

        this.channel.on('error', (err: unknown) => {
          logger.warn({ err }, '[outbox-publisher] confirm channel error');
        });
        this.channel.on('close', () => {
          this.channel = null;
          if (!this.closed) {
            void this.scheduleReconnect();
          }
        });

        this.connecting = false;
        logger.info('[outbox-publisher] RabbitMQ confirm channel ready');
        return;
      } catch (err) {
        this.reconnectAttempt += 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** (this.reconnectAttempt - 1), RECONNECT_MAX_MS);
        logger.warn({ err, delayMs: delay }, '[outbox-publisher] connect failed — backing off');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    this.connecting = false;
  }

  private scheduleReconnect(): void {
    if (this.connecting || this.closed) {
      return;
    }
    void this.connectWithBackoff();
  }
}
