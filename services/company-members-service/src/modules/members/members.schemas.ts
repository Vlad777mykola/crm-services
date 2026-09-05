import { z } from 'zod';

import type {
  ChangeMemberRoleRequest,
  CompanyIdParams,
  InviteMemberRequest,
  MemberIdParams,
  UpdateMemberRequest,
} from './members.contracts.js';

export const companyIdParamsSchema: z.ZodType<CompanyIdParams> = z.object({
  companyId: z.string().uuid(),
});
export type CompanyIdParamsInput = z.infer<typeof companyIdParamsSchema>;

export const memberIdParamsSchema: z.ZodType<MemberIdParams> = z.object({
  companyId: z.string().uuid(),
  memberId: z.string().uuid(),
});
export type MemberIdParamsInput = z.infer<typeof memberIdParamsSchema>;

export const inviteMemberRequestSchema: z.ZodType<InviteMemberRequest> = z.object({
  email: z.string().email(),
});
export type InviteMemberRequestInput = z.infer<typeof inviteMemberRequestSchema>;

export const updateMemberRequestSchema: z.ZodType<UpdateMemberRequest> = z.object({
  status: z.enum(['active', 'removed']),
});
export type UpdateMemberRequestInput = z.infer<typeof updateMemberRequestSchema>;

export const changeMemberRoleRequestSchema: z.ZodType<ChangeMemberRoleRequest> = z.object({
  role: z.enum(['owner', 'manager']),
});
export type ChangeMemberRoleRequestInput = z.infer<typeof changeMemberRoleRequestSchema>;
