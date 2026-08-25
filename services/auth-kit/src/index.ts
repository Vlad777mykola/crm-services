export { verifyAccessToken } from './jwt/verify-access-token.js';
export { createRequireAuth } from './middleware/create-require-auth.js';
export { createOptionalAuth } from './middleware/create-optional-auth.js';
export type { AccessTokenPayload, AuthContext, VerifyAccessTokenOptions } from './types.js';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      auth?: import('./types.js').AuthContext;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
