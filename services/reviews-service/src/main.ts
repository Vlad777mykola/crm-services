import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { ensureReviewsSchema } from './db/schema.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { ReviewsService } from './modules/reviews/reviews.service.js';

async function bootstrap(): Promise<void> {
  const pool = createPool();
  await ensureReviewsSchema(pool);

  const reviewsService = new ReviewsService(pool);
  const app = createApp(pool, reviewsService);

  const server = app.listen(env.PORT, () => {
    logger.info(`[reviews-service] listening on :${env.PORT}`);
  });

  function shutdown(signal: string): void {
    logger.info(`[reviews-service] received ${signal}, shutting down`);
    server.close(() => {
      pool
        .end()
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
