import { z } from 'zod';

export const createReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewRequestSchema>;

export const appointmentOnlyIdParamsSchema = z.object({
  appointmentId: z.string().uuid(),
});

export type AppointmentOnlyIdParams = z.infer<typeof appointmentOnlyIdParamsSchema>;

export const companyIdParamsSchema = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

export const serviceOnlyIdParamsSchema = z.object({
  serviceId: z.string().uuid(),
});

export type ServiceOnlyIdParams = z.infer<typeof serviceOnlyIdParamsSchema>;

export const specialistIdParamsSchema = z.object({
  specialistId: z.string().uuid(),
});

export type SpecialistIdParams = z.infer<typeof specialistIdParamsSchema>;
