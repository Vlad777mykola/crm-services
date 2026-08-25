import 'dotenv/config';

import { z } from 'zod';

const booleanFlag = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4005),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/crm'),
  RABBITMQ_URL: z.string().default('amqp://crm:crm_local_only@localhost:5672/crm-dev'),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret-change-me'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  AUTO_DDL: booleanFlag.optional(),
}).transform((parsed) => ({
  ...parsed,
  AUTO_DDL: parsed.AUTO_DDL ?? parsed.NODE_ENV !== 'production',
}));

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
