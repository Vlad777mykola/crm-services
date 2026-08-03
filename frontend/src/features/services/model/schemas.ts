import { z } from 'zod';

export const serviceFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  durationMinutes: z
    .number({ error: 'Duration is required' })
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 minute'),
  price: z.string().optional(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
