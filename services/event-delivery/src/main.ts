import 'dotenv/config';

import amqp from 'amqplib';
import { Pool } from 'pg';
import { z } from 'zod';

import { RabbitMqSink } from './sinks/rabbitmq-sink.js';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OUTBOX_SCHEMA: z.string().min(1),
  RABBITMQ_URL: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
});

const env = envSchema.parse(process.env);

async function bootstrap(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const connection = await amqp.connect(env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  const sink = new RabbitMqSink(channel);

  console.log(`[event-delivery] watching ${env.OUTBOX_SCHEMA} (RFC2 initializer skeleton)`);

  const timer = setInterval(() => {
    void pool
      .query(`SELECT count(*)::int AS c FROM "${env.OUTBOX_SCHEMA}"."outbox_deliveries" WHERE status = 'pending'`)
      .then((result) => {
        const pending = result.rows[0]?.c ?? 0;
        if (pending > 0) {
          console.log(`[event-delivery] pending deliveries=${pending} (claim + ${sink.constructor.name} wiring is RFC2 follow-up)`);
        }
      })
      .catch(() => {});
  }, env.POLL_INTERVAL_MS);

  process.on('SIGINT', () => {
    clearInterval(timer);
    void pool.end();
    void channel.close();
    void connection.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
