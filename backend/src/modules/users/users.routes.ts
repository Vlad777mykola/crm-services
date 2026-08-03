import { Router } from 'express';

import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';

import {
  createUserRequestSchema,
  updateUserRequestSchema,
  userIdParamsSchema,
  type UpdateUserRequestInput,
  type UserIdParams,
} from './users.schemas.js';
import { createUser, getUserById, updateUserProfile } from './users.service.js';

export const usersRouter = Router();

usersRouter.post('/users', validate(createUserRequestSchema, 'body'), async (req, res, next) => {
  try {
    const user = await createUser(req.body as { email: string; name: string });
    res.status(201).json({ message: 'User created', data: user });
  } catch (err) {
    next(err);
  }
});

// Registered before `/users/:id` so `me` is never captured as an `:id` path param.
usersRouter.get('/users/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.auth!.userId);
    res.status(200).json({ message: 'Current user profile', data: user });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch(
  '/users/me',
  requireAuth,
  validate(updateUserRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const user = await updateUserProfile(req.auth!.userId, req.body as UpdateUserRequestInput);
      res.status(200).json({ message: 'Profile updated', data: user });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get('/users/:id', validate(userIdParamsSchema, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params as unknown as UserIdParams;
    const user = await getUserById(id);
    res.status(200).json({ message: 'User found', data: user });
  } catch (err) {
    next(err);
  }
});
