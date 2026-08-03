import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `requireAuth` middleware once the access token is verified. */
      auth?: {
        userId: string;
      };
      /**
       * Populated by `validate(schema, 'query')` with the parsed/coerced query params.
       * `req.query` itself can't be reassigned in Express 5 (it's a getter), so
       * validated query data lives here instead - cast it to the expected type at
       * the call site, the same way `req.params`/`req.body` are cast elsewhere.
       */
      validatedQuery?: unknown;
    }
  }
}
