import type { CreateServiceRequestInput } from '../../../modules/services/services.schemas.js';

export interface CreateServiceCommand {
  companyId: string;
  requesterUserId: string;
  input: CreateServiceRequestInput;
}
