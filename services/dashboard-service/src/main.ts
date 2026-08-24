import { createApp } from './app.js';
import { createDataSource } from './db/data-source.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();

  const dashboardService = new DashboardService(dataSource);
  const app = createApp(dataSource, dashboardService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[dashboard-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[dashboard-service] received ${signal}, shutting down`);
    server.close(() => {
      dataSource.destroy().finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[dashboard-service] failed to start');
  process.exit(1);
});
