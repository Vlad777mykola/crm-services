import type { CreateSpecialistProfileRequestInput } from '../../../modules/specialists/specialists.schemas.js';

export interface CreateMySpecialistProfileCommand {
  userId: string;
  input: CreateSpecialistProfileRequestInput;
}
