import amqp, { type Channel, type ChannelModel } from 'amqplib';

import { env } from '../env.js';
import { logger } from '../logger.js';
import { declareTopology } from './topology.js';

export class RabbitMqPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    this.connection = await amqp.connect(env.RABBITMQ_URL);
    this.connection.on('error', (err: unknown) => logger.warn({ err }, '[outbox-publisher] RabbitMQ connection error'));
    this.connection.on('close', () => {
      this.connection = null;
      this.channel = null;
    });

    this.channel = await this.connection.createChannel();
    await declareTopology(this.channel);
  }

  isConnected(): boolean {
    return this.channel !== null;
  }

  publish(exchange: string, routingKey: string, body: Buffer): boolean {
    if (!this.channel) {
      throw new Error('RabbitMqPublisher is not connected');
    }
    return this.channel.publish(exchange, routingKey, body, { contentType: 'application/json', persistent: true });
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}
