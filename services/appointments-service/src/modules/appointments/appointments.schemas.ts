import { z } from 'zod';

import type {
  AppointmentIdParams,
  AppointmentOnlyIdParams,
  AvailabilityRuleRequest,
  AvailableSlotsQuery,
  ChangeAppointmentServiceRequest,
  CompanyIdParams,
  CreateTimeBlockRequest,
  CreateAppointmentRequest,
  ListAppointmentsQuery,
  ReassignAppointmentSpecialistRequest,
  RespondToAppointmentRequest,
  RescheduleAppointmentRequest,
  SetAvailabilityRulesRequest,
  SpecialistAvailabilityParams,
  SpecialistTimeBlockParams,
  TimeBlockParams,
  UpdateAppointmentNotesRequest,
} from './appointments.contracts.js';

export const createAppointmentRequestSchema: z.ZodType<CreateAppointmentRequest> = z.object({
  serviceId: z.string().uuid(),
  specialistProfileId: z.string().uuid(),
  requestedStartAt: z.string().datetime().optional(),
  windowFrom: z.string().datetime().optional(),
  windowTo: z.string().datetime().optional(),
  mode: z.enum(['exact', 'next_available']).optional(),
  notes: z.string().nullable().optional(),
}).superRefine((value, ctx) => {
  if ((value.mode ?? 'exact') === 'exact' && !value.requestedStartAt) {
    ctx.addIssue({ code: 'custom', path: ['requestedStartAt'], message: 'Required for exact booking' });
  }
  if (value.mode === 'next_available' && (!value.windowFrom || !value.windowTo)) {
    ctx.addIssue({ code: 'custom', path: ['windowFrom'], message: 'windowFrom and windowTo are required for next available booking' });
  }
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentRequestSchema>;

export const availableSlotsQuerySchema: z.ZodType<AvailableSlotsQuery> = z.object({
  companyId: z.string().uuid(),
  serviceId: z.string().uuid(),
  specialistProfileId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  slotStepMinutes: z.coerce.number().int().positive().max(240).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type AvailableSlotsQueryInput = z.infer<typeof availableSlotsQuerySchema>;

export const respondToAppointmentRequestSchema: z.ZodType<RespondToAppointmentRequest> = z.object({
  status: z.enum(['approved', 'rejected']),
});

export type RespondToAppointmentInput = z.infer<typeof respondToAppointmentRequestSchema>;

export const rescheduleAppointmentRequestSchema: z.ZodType<RescheduleAppointmentRequest> = z.object({
  specialistProfileId: z.string().uuid().optional(),
  startAt: z.string().datetime(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentRequestSchema>;

export const reassignAppointmentSpecialistRequestSchema: z.ZodType<ReassignAppointmentSpecialistRequest> = z.object({
  specialistProfileId: z.string().uuid(),
});

export type ReassignAppointmentSpecialistInput = z.infer<typeof reassignAppointmentSpecialistRequestSchema>;

export const changeAppointmentServiceRequestSchema: z.ZodType<ChangeAppointmentServiceRequest> = z.object({
  serviceId: z.string().uuid(),
});

export type ChangeAppointmentServiceInput = z.infer<typeof changeAppointmentServiceRequestSchema>;

export const updateAppointmentNotesRequestSchema: z.ZodType<UpdateAppointmentNotesRequest> = z.object({
  notes: z.string().nullable(),
});

export type UpdateAppointmentNotesInput = z.infer<typeof updateAppointmentNotesRequestSchema>;

export const listAppointmentsQuerySchema: z.ZodType<ListAppointmentsQuery> = z.object({
  companyId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'completed']).optional(),
  serviceId: z.string().uuid().optional(),
  specialistProfileId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export type ListAppointmentsQueryInput = z.infer<typeof listAppointmentsQuerySchema>;

export const availabilityRuleSchema: z.ZodType<AvailabilityRuleRequest> = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1).max(100).optional(),
  active: z.boolean().optional(),
});

export const setAvailabilityRulesRequestSchema: z.ZodType<SetAvailabilityRulesRequest> = z.object({
  rules: z.array(availabilityRuleSchema).max(28),
});

export type SetAvailabilityRulesInput = z.infer<typeof setAvailabilityRulesRequestSchema>;

export const createTimeBlockRequestSchema: z.ZodType<CreateTimeBlockRequest> = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().nullable().optional(),
});

export type CreateTimeBlockInput = z.infer<typeof createTimeBlockRequestSchema>;

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

export const specialistAvailabilityParamsSchema: z.ZodType<SpecialistAvailabilityParams> = z.object({
  companyId: z.string().uuid(),
  specialistProfileId: z.string().uuid(),
});

export type SpecialistAvailabilityParamsInput = z.infer<typeof specialistAvailabilityParamsSchema>;

export const timeBlockParamsSchema: z.ZodType<TimeBlockParams> = z.object({
  companyId: z.string().uuid(),
  blockId: z.string().uuid(),
});

export type TimeBlockParamsInput = z.infer<typeof timeBlockParamsSchema>;

export const specialistTimeBlockParamsSchema: z.ZodType<SpecialistTimeBlockParams> = z.object({
  companyId: z.string().uuid(),
  specialistProfileId: z.string().uuid(),
  blockId: z.string().uuid(),
});

export type SpecialistTimeBlockParamsInput = z.infer<typeof specialistTimeBlockParamsSchema>;
