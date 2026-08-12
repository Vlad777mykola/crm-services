import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { ensureSpecialistsSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { SpecialistsService } from './modules/specialists/specialists.service.js';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureSpecialistsSchema(pool);

  const specialistsService = new SpecialistsService(pool);
  const app = createApp(pool, specialistsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[specialists-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[specialists-service] received ${signal}, shutting down`);
    server.close(() => {
      pool
        .end()
        .catch((err: unknown) => logger.error({ err }, '[specialists-service] error closing pool'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[specialists-service] failed to start');
  process.exit(1);
});
