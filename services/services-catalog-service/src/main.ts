import { createApp } from './app.js';
import { createDataSource } from './db/data-source.js';
import { ensureServicesSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { ServiceSpecialistsService } from './modules/services/service-specialists.service.js';
import { ServicesService } from './modules/services/services.service.js';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await ensureServicesSchema(dataSource);

  const servicesService = new ServicesService(dataSource);
  const serviceSpecialistsService = new ServiceSpecialistsService(dataSource);
  const app = createApp(dataSource, servicesService, serviceSpecialistsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[services-catalog-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[services-catalog-service] received ${signal}, shutting down`);
    server.close(() => {
      dataSource
        .destroy()
        .catch((err: unknown) => logger.error({ err }, '[services-catalog-service] error closing data source'))
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
