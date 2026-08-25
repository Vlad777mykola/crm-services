import type { StatusHistoryRow } from '../../../db/specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { SpecialistReadRepository } from '../../ports/specialist-repositories.js';
import type { ListMySpecialistStatusHistoryQuery } from './list-my-specialist-status-history.query.js';

export class ListMySpecialistStatusHistoryHandler {
  constructor(private readonly reads: SpecialistReadRepository) {}

  async execute(query: ListMySpecialistStatusHistoryQuery): Promise<StatusHistoryRow[]> {
    const profile = await this.reads.findByUserId(query.userId);
    if (!profile) {
      throw new AppError('This user does not have a specialist profile yet', 404);
    }
    return this.reads.listStatusHistory(profile.id);
  }
}
