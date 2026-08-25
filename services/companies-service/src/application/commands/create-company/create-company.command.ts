import type { CreateCompanyRequestInput } from '../../../modules/companies/companies.schemas.js';

export interface CreateCompanyCommand {
  input: CreateCompanyRequestInput;
  creatorUserId: string;
  correlationId?: string;
}
