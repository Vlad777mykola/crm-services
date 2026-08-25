import type { UpdateUserRequestInput } from '../../../modules/users/users.schemas.js';

export interface UpdateUserProfileCommand {
  userId: string;
  patch: UpdateUserRequestInput;
  correlationId?: string;
}
