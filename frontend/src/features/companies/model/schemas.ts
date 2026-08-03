import { z } from 'zod';

export const companyFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  isRemoteSupported: z.boolean(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
