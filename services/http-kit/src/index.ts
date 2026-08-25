export { AppError } from './errors/AppError.js';
export { createErrorHandler } from './errors/create-error-handler.js';
export { createRequestIdMiddleware } from './middleware/request-id.js';
export { createRequestLogger } from './middleware/request-logger.js';
export { createHealthRouter } from './routes/health.routes.js';
export { createNotFoundHandler } from './routes/not-found-handler.js';
export { asyncHandler } from './utils/async-handler.js';

export type RequestContext = {
  requestId: string;
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
