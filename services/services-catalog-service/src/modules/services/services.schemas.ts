import { z } from 'zod';

import { paginationQuerySchema } from '../../common/pagination.js';
import type {
  CompanyIdParams,
  CreateServiceRequest,
  PublicServicesQuery,
  ServiceIdParams,
  ServiceOnlyIdParams,
  UpdateServiceRequest,
} from './services.contracts.js';

export const createServiceRequestSchema: z.ZodType<CreateServiceRequest> = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(1),
  price: z.string().nullable().optional(),
});

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;

export const updateServiceRequestSchema: z.ZodType<UpdateServiceRequest> = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  price: z.string().nullable().optional(),
  // `suspended` is a moderation state, not settable by the owner/manager via this endpoint.
  status: z.enum(['draft', 'published']).optional(),
});

export type UpdateServiceRequestInput = z.infer<typeof updateServiceRequestSchema>;

export const companyIdParamsSchema: z.ZodType<CompanyIdParams> = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParamsInput = z.infer<typeof companyIdParamsSchema>;

export const serviceIdParamsSchema: z.ZodType<ServiceIdParams> = z.object({
  companyId: z.string().uuid(),
  serviceId: z.string().uuid(),
});

export type ServiceIdParamsInput = z.infer<typeof serviceIdParamsSchema>;

export const serviceOnlyIdParamsSchema: z.ZodType<ServiceOnlyIdParams> = z.object({
  serviceId: z.string().uuid(),
});

export type ServiceOnlyIdParamsInput = z.infer<typeof serviceOnlyIdParamsSchema>;

export const publicServicesQuerySchema: z.ZodType<PublicServicesQuery> = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
});

export type PublicServicesQueryInput = z.infer<typeof publicServicesQuerySchema>;
