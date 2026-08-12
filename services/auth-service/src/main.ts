import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { ensureAuthSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { AuthService } from './modules/auth/auth.service.js';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureAuthSchema(pool);

  const authService = new AuthService(pool);
  const app = createApp(pool, authService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[auth-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[auth-service] received ${signal}, shutting down`);
    server.close(() => {
      pool
        .end()
        .catch((err: unknown) => logger.error({ err }, '[auth-service] error closing pool'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[auth-service] failed to start');
  process.exit(1);
});
