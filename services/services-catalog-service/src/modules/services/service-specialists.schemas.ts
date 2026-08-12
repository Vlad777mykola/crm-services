import { z } from 'zod';

export const assignServiceSpecialistRequestSchema = z.object({
  specialistProfileId: z.string().uuid(),
});

export type AssignServiceSpecialistInput = z.infer<typeof assignServiceSpecialistRequestSchema>;

export const serviceSpecialistParamsSchema = z.object({
  serviceId: z.string().uuid(),
  specialistProfileId: z.string().uuid(),
});

export type ServiceSpecialistParams = z.infer<typeof serviceSpecialistParamsSchema>;
