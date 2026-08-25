import { createOptionalAuth, createRequireAuth } from '@crm/auth-kit';

import { env } from '../env.js';

export const requireAuth = createRequireAuth({ jwtSecret: env.JWT_ACCESS_SECRET });
export const optionalAuth = createOptionalAuth({ jwtSecret: env.JWT_ACCESS_SECRET });
