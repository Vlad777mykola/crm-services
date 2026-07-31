import { pinoHttp } from 'pino-http';

import { logger } from '../../infrastructure/logger/logger.js';

export const requestLogger = pinoHttp({ logger });
