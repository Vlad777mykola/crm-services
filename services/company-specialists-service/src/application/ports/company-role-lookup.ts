export type CompanyMemberRole = 'owner' | 'manager';

export interface CompanyRoleLookup {
  findActiveMembershipRole(companyId: string, userId: string): Promise<CompanyMemberRole | undefined>;
}
