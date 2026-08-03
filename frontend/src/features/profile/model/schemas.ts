import { z } from 'zod';

export const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
