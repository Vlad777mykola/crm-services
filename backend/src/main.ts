import { createApp } from './app.js';
import { env } from './env/env.js';
import { AppDataSource } from './infrastructure/database/data-source.js';
import { logger } from './infrastructure/logger/logger.js';

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to the database');
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  function shutdown(signal: string): void {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
      AppDataSource.destroy()
        .catch((err: unknown) => {
          logger.error({ err }, 'Error closing database connection');
        })
        .finally(() => {
          process.exit(0);
        });
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
