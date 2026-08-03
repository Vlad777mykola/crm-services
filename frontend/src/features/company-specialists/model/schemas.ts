import { z } from 'zod';

export const sendSpecialistRequestFormSchema = z.object({
  specialistProfileId: z.string().uuid('Select a specialist'),
  message: z.string().optional(),
});

export type SendSpecialistRequestFormValues = z.infer<typeof sendSpecialistRequestFormSchema>;
