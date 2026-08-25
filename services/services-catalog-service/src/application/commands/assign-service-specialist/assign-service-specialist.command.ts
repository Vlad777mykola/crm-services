import type { AssignServiceSpecialistInput } from '../../../modules/services/service-specialists.schemas.js';

export interface AssignServiceSpecialistCommand {
  serviceId: string;
  requesterUserId: string;
  input: AssignServiceSpecialistInput;
}
