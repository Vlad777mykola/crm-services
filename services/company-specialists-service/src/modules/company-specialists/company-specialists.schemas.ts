import { z } from 'zod';

import type {
  CompanyIdParams,
  RequestIdParams,
  SendSpecialistRequestRequest,
} from './company-specialists.contracts.js';

export const companyIdParamsSchema: z.ZodType<CompanyIdParams> = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParamsInput = z.infer<typeof companyIdParamsSchema>;

export const requestIdParamsSchema: z.ZodType<RequestIdParams> = z.object({
  requestId: z.string().uuid(),
});

export type RequestIdParamsInput = z.infer<typeof requestIdParamsSchema>;

export const sendSpecialistRequestSchema: z.ZodType<SendSpecialistRequestRequest> = z.object({
  specialistProfileId: z.string().uuid(),
  message: z.string().nullable().optional(),
});

export type SendSpecialistRequestInput = z.infer<typeof sendSpecialistRequestSchema>;
