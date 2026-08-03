import { z } from 'zod';

export const specialistProfileFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  headline: z.string().optional(),
  bio: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  isRemoteSupported: z.boolean(),
});

export type SpecialistProfileFormValues = z.infer<typeof specialistProfileFormSchema>;
