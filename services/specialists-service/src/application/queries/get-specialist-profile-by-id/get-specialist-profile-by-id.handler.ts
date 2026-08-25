import type { SpecialistProfileRow } from '../../../db/specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { SpecialistReadRepository } from '../../ports/specialist-repositories.js';
import type { GetSpecialistProfileByIdQuery } from './get-specialist-profile-by-id.query.js';

export class GetSpecialistProfileByIdHandler {
  constructor(private readonly reads: SpecialistReadRepository) {}

  async execute(query: GetSpecialistProfileByIdQuery): Promise<SpecialistProfileRow> {
    const profile = await this.reads.findById(query.specialistId);
    if (!profile) {
      throw new AppError('Specialist profile not found', 404);
    }

    if (profile.status === 'published') {
      return profile;
    }

    if (!query.requesterUserId || query.requesterUserId !== profile.userId) {
      throw new AppError('Specialist profile not found', 404);
    }
    return profile;
  }
}
