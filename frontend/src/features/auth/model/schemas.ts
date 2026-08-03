import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
