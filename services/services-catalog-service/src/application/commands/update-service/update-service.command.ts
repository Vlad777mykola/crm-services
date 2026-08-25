import type { UpdateServiceRequestInput } from '../../../modules/services/services.schemas.js';

export interface UpdateServiceCommand {
  companyId: string;
  serviceId: string;
  requesterUserId: string;
  patch: UpdateServiceRequestInput;
}
