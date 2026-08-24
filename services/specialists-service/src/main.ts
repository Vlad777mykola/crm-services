import { createApp } from './app.js';
import { createDataSource } from './db/data-source.js';
import { ensureSpecialistsSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { SpecialistsService } from './modules/specialists/specialists.service.js';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await ensureSpecialistsSchema(dataSource);

  const specialistsService = new SpecialistsService(dataSource);
  const app = createApp(dataSource, specialistsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[specialists-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[specialists-service] received ${signal}, shutting down`);
    server.close(() => {
      dataSource
        .destroy()
        .catch((err: unknown) => logger.error({ err }, '[specialists-service] error closing data source'))
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
