export interface CompanyMemberAddedData {
  companyId: string;
  userId: string;
  role: 'owner' | 'manager';
}

export interface CompanyMemberRemovedData {
  companyId: string;
  userId: string;
}
