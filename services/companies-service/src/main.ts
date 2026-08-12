import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { ensureCompaniesSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { CompaniesService } from './modules/companies/companies.service.js';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureCompaniesSchema(pool);

  const companiesService = new CompaniesService(pool);
  const app = createApp(pool, companiesService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[companies-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[companies-service] received ${signal}, shutting down`);
    server.close(() => {
      pool
        .end()
        .catch((err: unknown) => logger.error({ err }, '[companies-service] error closing pool'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[companies-service] failed to start');
  process.exit(1);
});
