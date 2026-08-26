import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4012),
  GATEWAY_URL: z.string().url().default('http://localhost:8080'),
  DOCS_PATH: z
    .string()
    .regex(/^\/[a-z0-9-]*$/, 'DOCS_PATH must start with / and contain only lowercase letters, digits, and hyphens')
    .default('/docs'),
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
