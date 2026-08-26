import { z } from 'zod';

export const appointmentRequestFormSchema = z.object({
  specialistProfileId: z.string().uuid('Please choose a specialist'),
  requestedStartAt: z.string().min(1, 'Please choose an available slot'),
  notes: z.string().optional(),
});

export type AppointmentRequestFormValues = z.infer<typeof appointmentRequestFormSchema>;
