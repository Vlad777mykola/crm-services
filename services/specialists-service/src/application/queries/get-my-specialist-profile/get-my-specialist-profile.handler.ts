import type { SpecialistProfileRow } from '../../../db/specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { SpecialistReadRepository } from '../../ports/specialist-repositories.js';
import type { GetMySpecialistProfileQuery } from './get-my-specialist-profile.query.js';

export class GetMySpecialistProfileHandler {
  constructor(private readonly reads: SpecialistReadRepository) {}

  async execute(query: GetMySpecialistProfileQuery): Promise<SpecialistProfileRow> {
    const profile = await this.reads.findByUserId(query.userId);
    if (!profile) {
      throw new AppError('This user does not have a specialist profile yet', 404);
    }
    return profile;
  }
}
