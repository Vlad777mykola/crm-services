import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  RABBITMQ_URL: z.string().min(1),
  // Serves both /health/* and the /notifications/me* HTTP API - one Express
  // app, one port. Kept named HEALTH_PORT (not PORT) since every existing
  // compose/env file already references it under that name.
  HEALTH_PORT: z.coerce.number().int().positive().default(4300),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret-change-me'),
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
