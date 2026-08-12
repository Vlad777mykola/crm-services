import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  const dashboardService = new DashboardService(pool);
  const app = createApp(pool, dashboardService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[dashboard-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[dashboard-service] received ${signal}, shutting down`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[dashboard-service] failed to start');
  process.exit(1);
});
