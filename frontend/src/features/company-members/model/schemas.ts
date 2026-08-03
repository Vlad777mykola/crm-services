import { z } from 'zod';

export const inviteMemberFormSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberFormSchema>;
