import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/crm'),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret-change-me'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default('refreshToken'),
  // Controls the in-process notification subscriber (see
  // infrastructure/events/event-bus.ts GatedEventBus). The API never talks to
  // RabbitMQ directly - domain events reach other services only through the
  // outbox pattern (infrastructure/outbox) and services/outbox-publisher.
  // Keep this true for a standalone backend (MVP: creates notifications
  // in-process). Set to false once services/notifications-service is
  // deployed, so notifications aren't created twice - see
  // docs/architecture/service-ownership.md, "side-effect ownership".
  IN_PROCESS_NOTIFICATIONS_ENABLED: z
    .string()
    .default('true')
    .transform((value) => value === 'true'),
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
