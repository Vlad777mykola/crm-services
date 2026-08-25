/** Matches contracts/events/company.created.v1.json's `data` shape. */
export interface CompanyCreatedData {
  companyId: string;
  name: string;
  slug: string;
  createdByUserId: string;
}
