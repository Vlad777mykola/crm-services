import { z } from 'zod';

import { paginationQuerySchema } from '../../common/pagination.js';

export const createServiceRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(1),
  price: z.string().nullable().optional(),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;

export const updateServiceRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  price: z.string().nullable().optional(),
  // `suspended` is a moderation state, not settable by the owner/manager via this endpoint.
  status: z.enum(['draft', 'published']).optional(),
});

export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;

export const companyIdParamsSchema = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

export const serviceIdParamsSchema = z.object({
  companyId: z.string().uuid(),
  serviceId: z.string().uuid(),
});

export type ServiceIdParams = z.infer<typeof serviceIdParamsSchema>;

export const serviceOnlyIdParamsSchema = z.object({
  serviceId: z.string().uuid(),
});

export type ServiceOnlyIdParams = z.infer<typeof serviceOnlyIdParamsSchema>;

export const publicServicesQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
});

export type PublicServicesQueryInput = z.infer<typeof publicServicesQuerySchema>;
