import { createApp } from './app.js';
import { createDataSource } from './db/data-source.js';
import { ensureReviewsSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { ReviewsService } from './modules/reviews/reviews.service.js';

async function bootstrap(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  await ensureReviewsSchema(dataSource);

  const reviewsService = new ReviewsService(dataSource);
  const app = createApp(dataSource, reviewsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[reviews-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[reviews-service] received ${signal}, shutting down`);
    server.close(() => {
      dataSource
        .destroy()
        .catch((err: unknown) => logger.error({ err }, '[reviews-service] error during shutdown'))
        .finally(() => process.exit(0));
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, '[reviews-service] failed to start');
  process.exit(1);
});
