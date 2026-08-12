import { z } from 'zod';

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export const updateUserRequestSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
});

export type UpdateUserRequestInput = z.infer<typeof updateUserRequestSchema>;
