import { z } from 'zod';

import type {
  AppointmentIdParams,
  AppointmentOnlyIdParams,
  CompanyIdParams,
  CreateAppointmentRequest,
  RespondToAppointmentRequest,
} from './appointments.contracts.js';

export const createAppointmentRequestSchema: z.ZodType<CreateAppointmentRequest> = z.object({
  serviceId: z.string().uuid(),
  specialistProfileId: z.string().uuid().nullable().optional(),
  requestedStartAt: z.string().datetime(),
  notes: z.string().nullable().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentRequestSchema>;

export const respondToAppointmentRequestSchema: z.ZodType<RespondToAppointmentRequest> = z.object({
  status: z.enum(['approved', 'rejected']),
});

export type RespondToAppointmentInput = z.infer<typeof respondToAppointmentRequestSchema>;

export const companyIdParamsSchema: z.ZodType<CompanyIdParams> = z.object({
  companyId: z.string().uuid(),
});

export type CompanyIdParamsInput = z.infer<typeof companyIdParamsSchema>;

export const appointmentIdParamsSchema: z.ZodType<AppointmentIdParams> = z.object({
  companyId: z.string().uuid(),
  appointmentId: z.string().uuid(),
});

export type AppointmentIdParamsInput = z.infer<typeof appointmentIdParamsSchema>;

export const appointmentOnlyIdParamsSchema: z.ZodType<AppointmentOnlyIdParams> = z.object({
  appointmentId: z.string().uuid(),
});

export type AppointmentOnlyIdParamsInput = z.infer<typeof appointmentOnlyIdParamsSchema>;
