import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  RABBITMQ_URL: z.string().min(1),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/crm'),
  PORT: z.coerce.number().int().positive().default(4011),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Shorter in tests (100/300/1000); production-style docs use 5s/30s/5m. */
  RETRY_TIER_1_MS: z.coerce.number().int().positive().default(5_000),
  RETRY_TIER_2_MS: z.coerce.number().int().positive().default(30_000),
  RETRY_TIER_3_MS: z.coerce.number().int().positive().default(300_000),
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
