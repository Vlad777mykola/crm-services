import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { ensureCompanySpecialistsSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { CompanySpecialistsService } from './modules/company-specialists/company-specialists.service.js';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureCompanySpecialistsSchema(pool);

  const service = new CompanySpecialistsService(pool);
  const app = createApp(pool, service);

  const server = app.listen(env.PORT, () => {
    logger.info(`[company-specialists-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[company-specialists-service] received ${signal}, shutting down`);
    server.close(() => {
      pool
        .end()
        .catch((err: unknown) => logger.error({ err }, '[company-specialists-service] error closing pool'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[company-specialists-service] failed to start');
  process.exit(1);
});
