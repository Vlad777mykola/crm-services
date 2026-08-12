import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `requireAuth` middleware once the access token is verified. */
      auth?: {
        userId: string;
      };
    }
  }
}
