import type { DataSource } from 'typeorm';

import type { SpecialistProfileRow } from '../../../db/specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { SpecialistEventOutbox } from '../../ports/specialist-event-outbox.js';
import type { SpecialistReadRepository, SpecialistWriteRepository } from '../../ports/specialist-repositories.js';
import type { CreateMySpecialistProfileCommand } from './create-my-specialist-profile.command.js';

export class CreateMySpecialistProfileHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reads: SpecialistReadRepository,
    private readonly writes: SpecialistWriteRepository,
    private readonly outbox: SpecialistEventOutbox,
  ) {}

  async execute(command: CreateMySpecialistProfileCommand): Promise<SpecialistProfileRow> {
    const existing = await this.reads.findByUserId(command.userId);
    if (existing) {
      throw new AppError('This user already has a specialist profile', 409);
    }

    return this.dataSource.transaction(async (manager) => {
      const profile = await this.writes.insert(manager, {
        userId: command.userId,
        displayName: command.input.displayName,
        headline: command.input.headline ?? null,
        bio: command.input.bio ?? null,
        category: command.input.category ?? null,
        city: command.input.city ?? null,
        isRemoteSupported: command.input.isRemoteSupported ?? false,
      });

      await this.writes.insertStatusHistory(manager, {
        specialistProfileId: profile.id,
        fromStatus: null,
        toStatus: profile.status,
        changedByUserId: command.userId,
      });

      await this.outbox.record(manager, {
        type: 'specialist.created',
        aggregateId: profile.id,
        correlationId: command.correlationId ?? null,
        payload: { specialistProfileId: profile.id, userId: command.userId, displayName: profile.displayName },
      });

      return profile;
    });
  }
}
