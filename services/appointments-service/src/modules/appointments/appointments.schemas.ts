import { z } from 'zod';

export const createAppointmentRequestSchema = z.object({
  serviceId: z.string().uuid(),
  specialistProfileId: z.string().uuid().nullable().optional(),
  requestedStartAt: z.string().datetime(),
  notes: z.string().nullable().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentRequestSchema>;

export const respondToAppointmentRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export type RespondToAppointmentInput = z.infer<typeof respondToAppointmentRequestSchema>;

export const companyIdParamsSchema = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

export const appointmentIdParamsSchema = z.object({
  companyId: z.string().uuid(),
  appointmentId: z.string().uuid(),
});

export type AppointmentIdParams = z.infer<typeof appointmentIdParamsSchema>;

export const appointmentOnlyIdParamsSchema = z.object({
  appointmentId: z.string().uuid(),
});

export type AppointmentOnlyIdParams = z.infer<typeof appointmentOnlyIdParamsSchema>;
