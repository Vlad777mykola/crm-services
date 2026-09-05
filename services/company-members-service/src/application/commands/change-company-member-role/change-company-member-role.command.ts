import type { MemberRole } from '../../../db/member-repository.js';

export interface ChangeCompanyMemberRoleCommand {
  companyId: string;
  requesterUserId: string;
  memberId: string;
  role: MemberRole;
  correlationId?: string;
}
