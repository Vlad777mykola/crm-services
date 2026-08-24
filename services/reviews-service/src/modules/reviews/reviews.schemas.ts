import { z } from 'zod';

import type {
  AppointmentOnlyIdParams,
  CompanyIdParams,
  CreateReviewRequest,
  ServiceOnlyIdParams,
  SpecialistIdParams,
} from './reviews.contracts.js';

export const createReviewRequestSchema: z.ZodType<CreateReviewRequest> = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewRequestSchema>;

export const appointmentOnlyIdParamsSchema: z.ZodType<AppointmentOnlyIdParams> = z.object({
  appointmentId: z.string().uuid(),
});

export type AppointmentOnlyIdParamsInput = z.infer<typeof appointmentOnlyIdParamsSchema>;

export const companyIdParamsSchema: z.ZodType<CompanyIdParams> = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParamsInput = z.infer<typeof companyIdParamsSchema>;

export const serviceOnlyIdParamsSchema: z.ZodType<ServiceOnlyIdParams> = z.object({
  serviceId: z.string().uuid(),
});

export type ServiceOnlyIdParamsInput = z.infer<typeof serviceOnlyIdParamsSchema>;

export const specialistIdParamsSchema: z.ZodType<SpecialistIdParams> = z.object({
  specialistId: z.string().uuid(),
});

export type SpecialistIdParamsInput = z.infer<typeof specialistIdParamsSchema>;
