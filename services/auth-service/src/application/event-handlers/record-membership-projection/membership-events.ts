export interface CompanyMemberAddedData {
  companyId: string;
  userId: string;
  role: 'owner' | 'manager';
}

export interface CompanyMemberRemovedData {
  companyId: string;
  userId: string;
}

export interface CompanyMemberRoleChangedData {
  companyId: string;
  userId: string;
  fromRole: 'owner' | 'manager';
  toRole: 'owner' | 'manager';
}
