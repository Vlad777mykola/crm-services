export interface UpdateCompanyMemberStatusCommand {
  companyId: string;
  requesterUserId: string;
  memberId: string;
  status: 'active' | 'removed';
  correlationId?: string;
}
