import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Populated by `requireAuth`/`optionalAuth` once the access token (if any) is verified. */
      auth?: {
        userId: string;
      };
    }
  }
}
