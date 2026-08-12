import { z } from 'zod';

import { paginationQuerySchema } from '../../common/pagination.js';

export const createCompanyRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isRemoteSupported: z.boolean().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export type CreateCompanyRequestInput = z.infer<typeof createCompanyRequestSchema>;

export const updateCompanyRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isRemoteSupported: z.boolean().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  // `suspended` is a moderation state, not settable by the owner/manager via this endpoint.
  status: z.enum(['draft', 'published']).optional(),
});

export type UpdateCompanyRequestInput = z.infer<typeof updateCompanyRequestSchema>;

export const companyIdParamsSchema = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

export const publicCompaniesQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
});

export type PublicCompaniesQueryInput = z.infer<typeof publicCompaniesQuerySchema>;
