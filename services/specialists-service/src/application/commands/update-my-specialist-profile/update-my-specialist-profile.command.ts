import type { UpdateSpecialistProfileRequestInput } from '../../../modules/specialists/specialists.schemas.js';

export interface UpdateMySpecialistProfileCommand {
  userId: string;
  patch: UpdateSpecialistProfileRequestInput;
  correlationId?: string;
}
