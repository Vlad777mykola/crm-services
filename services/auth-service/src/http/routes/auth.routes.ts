import type { CookieOptions, Request } from 'express';
import { Router } from 'express';

import { env } from '../../env.js';
import type { AuthService, RequestMeta } from '../../modules/auth/auth.service.js';
import { loginRequestSchema, registerRequestSchema } from '../../modules/auth/auth.schemas.js';
import { requireAuth } from '../require-auth.js';
import { validate } from '../validate.js';

const REFRESH_COOKIE_NAME = env.REFRESH_TOKEN_COOKIE_NAME;
const REFRESH_COOKIE_PATH = '/auth';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function requestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  };
}

function getRefreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
}

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/auth/register', validate(registerRequestSchema), async (req, res, next) => {
    try {
      const { identity, accessToken, refreshToken } = await authService.register(
        req.body as { email: string; name: string; password: string },
        requestMeta(req),
      );
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
      res.status(201).json({ message: 'Registered', data: { user: identity, accessToken } });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/login', validate(loginRequestSchema), async (req, res, next) => {
    try {
      const { identity, accessToken, refreshToken } = await authService.login(
        req.body as { email: string; password: string },
        requestMeta(req),
      );
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
      res.status(200).json({ message: 'Logged in', data: { user: identity, accessToken } });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/refresh', async (req, res, next) => {
    try {
      const { accessToken, refreshToken } = await authService.refresh(getRefreshCookie(req), requestMeta(req));
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
      res.status(200).json({ message: 'Session refreshed', data: { accessToken } });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/logout', async (req, res, next) => {
    try {
      await authService.logout(getRefreshCookie(req));
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      res.status(200).json({ message: 'Logged out' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/auth/me', requireAuth, async (req, res, next) => {
    try {
      const identity = await authService.getCurrentIdentity(req.auth!.userId);
      res.status(200).json({ message: 'Current user', data: identity });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
