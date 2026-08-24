export interface CompanyIdParams {
  companyId: string;
}

export interface MemberIdParams {
  companyId: string;
  memberId: string;
}

export interface InviteMemberRequest {
  email: string;
}

export interface UpdateMemberRequest {
  status: 'active' | 'removed';
}
