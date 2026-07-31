import { Router } from 'express';

import { validate } from '../../common/middleware/validate.js';
import { createUserRequestSchema, userIdParamsSchema, type UserIdParams } from './users.schemas.js';
import { createUser, getUserById } from './users.service.js';

export const usersRouter = Router();

usersRouter.post('/users', validate(createUserRequestSchema, 'body'), async (req, res, next) => {
  try {
    const user = await createUser(req.body as { email: string; name: string });
    res.status(201).json({ message: 'User created', data: user });
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/users/:id', validate(userIdParamsSchema, 'params'), async (req, res, next) => {
  try {
    const { id } = req.params as unknown as UserIdParams;
    const user = await getUserById(id);
    res.status(200).json({ message: 'User found', data: user });
  } catch (err) {
    next(err);
  }
});
