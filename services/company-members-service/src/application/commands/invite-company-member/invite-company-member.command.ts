export interface InviteCompanyMemberCommand {
  companyId: string;
  requesterUserId: string;
  email: string;
  correlationId?: string;
}
