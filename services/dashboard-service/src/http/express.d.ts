declare global {
  namespace Express {
    interface Request {
      /** Populated by `requireAuth` once the access token is verified. */
      auth?: { userId: string };
    }
  }
}

export {};
