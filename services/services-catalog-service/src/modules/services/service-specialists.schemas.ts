import { z } from 'zod';

import type { AssignServiceSpecialistRequest, ServiceSpecialistParams } from './services.contracts.js';

export const assignServiceSpecialistRequestSchema: z.ZodType<AssignServiceSpecialistRequest> = z.object({
  specialistProfileId: z.string().uuid(),
});

export type AssignServiceSpecialistInput = z.infer<typeof assignServiceSpecialistRequestSchema>;

export const serviceSpecialistParamsSchema: z.ZodType<ServiceSpecialistParams> = z.object({
  serviceId: z.string().uuid(),
  specialistProfileId: z.string().uuid(),
});

export type ServiceSpecialistParamsInput = z.infer<typeof serviceSpecialistParamsSchema>;
