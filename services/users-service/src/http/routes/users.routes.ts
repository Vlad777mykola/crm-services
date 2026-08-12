import { Router } from 'express';

import { requireAuth } from '../require-auth.js';
import type { UsersService } from '../../modules/users/users.service.js';
import {
  updateUserRequestSchema,
  userIdParamsSchema,
  type UpdateUserRequestInput,
  type UserIdParams,
} from '../../modules/users/users.schemas.js';
import { validate } from '../validate.js';

/**
 * `POST /users` intentionally NOT implemented here - stays on legacy-backend
 * per Q5 (see docs/architecture/microservices-extraction-checklist.md Task
 * 3.1 / table-ownership-matrix.md "Undecided ownership").
 */
export function createUsersRouter(usersService: UsersService): Router {
  const router = Router();

  // Registered before `/users/:id` so `me` is never captured as an `:id` path param.
  router.get('/users/me', requireAuth, async (req, res, next) => {
    try {
      const user = await usersService.getById(req.auth!.userId);
      res.status(200).json({ message: 'Current user profile', data: user });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/users/me', requireAuth, validate(updateUserRequestSchema), async (req, res, next) => {
    try {
      const user = await usersService.updateProfile(req.auth!.userId, req.body as UpdateUserRequestInput);
      res.status(200).json({ message: 'Profile updated', data: user });
    } catch (err) {
      next(err);
    }
  });

  router.get('/users/:id', validate(userIdParamsSchema, 'params'), async (req, res, next) => {
    try {
      const { id } = req.params as unknown as UserIdParams;
      const user = await usersService.getById(id);
      res.status(200).json({ message: 'User found', data: user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
