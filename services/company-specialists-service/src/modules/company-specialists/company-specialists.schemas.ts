import { z } from 'zod';

export const companyIdParamsSchema = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

export const requestIdParamsSchema = z.object({
  requestId: z.string().uuid(),
});

export type RequestIdParams = z.infer<typeof requestIdParamsSchema>;

export const sendSpecialistRequestSchema = z.object({
  specialistProfileId: z.string().uuid(),
  message: z.string().nullable().optional(),
});

export type SendSpecialistRequestInput = z.infer<typeof sendSpecialistRequestSchema>;
