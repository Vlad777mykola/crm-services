import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Schema owning outbox_events (e.g. auth_schema). Empty = public.outbox_events (legacy). */
  OUTBOX_SCHEMA: z.string().optional().default(''),
  RABBITMQ_URL: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  BATCH_SIZE: z.coerce.number().int().positive().default(50),
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  HEALTH_PORT: z.coerce.number().int().positive().default(4500),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', z.flattenError(result.error).fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

/** Qualified SQL table reference for outbox_events in the configured schema. */
export function outboxEventsTable(): string {
  const schema = env.OUTBOX_SCHEMA.trim();
  return schema ? `"${schema}"."outbox_events"` : '"outbox_events"';
}
