import type { Channel } from 'amqplib';
import type { Pool } from 'pg';

let labChannel: Channel | null = null;
let labPool: Pool | null = null;

export function setLabChannel(channel: Channel): void {
  labChannel = channel;
}

export function getLabChannel(): Channel | null {
  return labChannel;
}

export function setLabPool(pool: Pool): void {
  labPool = pool;
}

export function getLabPool(): Pool | null {
  return labPool;
}
