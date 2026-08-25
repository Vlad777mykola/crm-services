import type { SendSpecialistRequestInput } from '../../../modules/company-specialists/company-specialists.schemas.js';

export interface SendSpecialistRequestCommand {
  companyId: string;
  requesterUserId: string;
  input: SendSpecialistRequestInput;
}
