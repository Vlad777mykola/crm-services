import { z } from 'zod';

export const companyIdParamsSchema = z.object({
  companyId: z.string().uuid(),
});
export type CompanyIdParams = z.infer<typeof companyIdParamsSchema>;

export const memberIdParamsSchema = z.object({
  companyId: z.string().uuid(),
  memberId: z.string().uuid(),
});
export type MemberIdParams = z.infer<typeof memberIdParamsSchema>;

export const inviteMemberRequestSchema = z.object({
  email: z.string().email(),
});
export type InviteMemberRequestInput = z.infer<typeof inviteMemberRequestSchema>;

export const updateMemberRequestSchema = z.object({
  status: z.enum(['active', 'removed']),
});
export type UpdateMemberRequestInput = z.infer<typeof updateMemberRequestSchema>;
