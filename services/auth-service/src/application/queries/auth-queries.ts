import { IdentityRepository } from '../../db/identity-repository.js';
import { AppError } from '../../errors/AppError.js';
import { toIdentityView, type IdentityView } from '../view-models/identity-view.js';

export class AuthQueries {
  constructor(private readonly identities: IdentityRepository) {}

  async getCurrentIdentity(userId: string): Promise<IdentityView> {
    const identity = await this.identities.findById(userId);
    if (!identity) {
      throw new AppError('User not found', 404);
    }
    return toIdentityView(identity);
  }
}
