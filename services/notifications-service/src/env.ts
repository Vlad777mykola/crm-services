import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  RABBITMQ_URL: z.string().min(1),
  // Serves both /health/* and the /notifications/me* HTTP API - one Express
  // app, one port. Kept named HEALTH_PORT (not PORT) since every existing
  // compose/env file already references it under that name.
  HEALTH_PORT: z.coerce.number().int().positive().default(4300),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret-change-me'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const flat = result.error.flatten();
    console.error('notifications-service failed to start\n');
    if (flat.fieldErrors) {
      const missing = Object.entries(flat.fieldErrors)
        .filter(([, v]) => v?.includes('Required') || v?.some((x) => x.includes('required')))
        .map(([k]) => k);
      const invalid = Object.entries(flat.fieldErrors).filter(
        ([, v]) => v && !v.some((x) => x.includes('required')),
      );
      if (missing.length) {
        console.error('Missing:');
        for (const k of missing) console.error(`  ${k}`);
      }
      if (invalid.length) {
        console.error('Invalid:');
        for (const [k, v] of invalid) console.error(`  ${k}: ${v?.join(', ')}`);
      }
    }
    console.error('Invalid environment variables:', flat.fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
