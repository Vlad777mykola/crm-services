import type { UpdateCompanyRequestInput } from '../../../modules/companies/companies.schemas.js';

export interface UpdateCompanyCommand {
  companyId: string;
  requesterUserId: string;
  patch: UpdateCompanyRequestInput;
}
