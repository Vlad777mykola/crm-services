import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { ensureServicesSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { ServiceSpecialistsService } from './modules/services/service-specialists.service.js';
import { ServicesService } from './modules/services/services.service.js';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureServicesSchema(pool);

  const servicesService = new ServicesService(pool);
  const serviceSpecialistsService = new ServiceSpecialistsService(pool);
  const app = createApp(pool, servicesService, serviceSpecialistsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[services-catalog-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[services-catalog-service] received ${signal}, shutting down`);
    server.close(() => {
      pool
        .end()
        .catch((err: unknown) => logger.error({ err }, '[services-catalog-service] error closing pool'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[services-catalog-service] failed to start');
  process.exit(1);
});
