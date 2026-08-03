import { z } from 'zod';

export const appointmentRequestFormSchema = z.object({
  specialistProfileId: z.string().uuid().optional().or(z.literal('')),
  requestedStartAt: z.string().min(1, 'Please choose a date and time'),
  notes: z.string().optional(),
});

export type AppointmentRequestFormValues = z.infer<typeof appointmentRequestFormSchema>;
