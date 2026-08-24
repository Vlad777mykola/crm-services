import { z } from 'zod';

import type { UpdateUserRequest, UserIdParams } from './users.contracts.js';

export const userIdParamsSchema: z.ZodType<UserIdParams> = z.object({
  id: z.string().uuid(),
});

export type UserIdParamsInput = z.infer<typeof userIdParamsSchema>;

export const updateUserRequestSchema: z.ZodType<UpdateUserRequest> = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
});

export type UpdateUserRequestInput = z.infer<typeof updateUserRequestSchema>;
