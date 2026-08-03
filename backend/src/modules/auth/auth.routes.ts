import type { CookieOptions, Request } from 'express';
import { Router } from 'express';

import { requireAuth } from '../../common/middleware/requireAuth.js';
import { validate } from '../../common/middleware/validate.js';
import { env } from '../../env/env.js';
import { loginRequestSchema, registerRequestSchema } from './auth.schemas.js';
import { getCurrentUser, login, logout, refresh, register, type RequestMeta } from './auth.service.js';

export const authRouter = Router();

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

authRouter.post('/auth/register', validate(registerRequestSchema, 'body'), async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await register(
      req.body as { email: string; name: string; password: string },
      requestMeta(req),
    );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    res.status(201).json({ message: 'Registered', data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/login', validate(loginRequestSchema, 'body'), async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await login(
      req.body as { email: string; password: string },
      requestMeta(req),
    );
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    res.status(200).json({ message: 'Logged in', data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/refresh', async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await refresh(getRefreshCookie(req), requestMeta(req));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    res.status(200).json({ message: 'Session refreshed', data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/logout', async (req, res, next) => {
  try {
    await logout(getRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.auth!.userId);
    res.status(200).json({ message: 'Current user', data: user });
  } catch (err) {
    next(err);
  }
});
