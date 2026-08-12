import { z } from 'zod';

import { paginationQuerySchema } from '../../common/pagination.js';

export const createSpecialistProfileRequestSchema = z.object({
  displayName: z.string().min(1),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  isRemoteSupported: z.boolean().optional(),
});
export type CreateSpecialistProfileRequestInput = z.infer<typeof createSpecialistProfileRequestSchema>;

export const updateSpecialistProfileRequestSchema = z.object({
  displayName: z.string().min(1).optional(),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  isRemoteSupported: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional(),
});
export type UpdateSpecialistProfileRequestInput = z.infer<typeof updateSpecialistProfileRequestSchema>;

export const specialistIdParamsSchema = z.object({
  specialistId: z.string().uuid(),
});
export type SpecialistIdParams = z.infer<typeof specialistIdParamsSchema>;

export const publicSpecialistsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  remoteOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});
export type PublicSpecialistsQueryInput = z.infer<typeof publicSpecialistsQuerySchema>;
