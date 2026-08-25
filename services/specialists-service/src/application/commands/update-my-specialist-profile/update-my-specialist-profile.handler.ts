import type { DataSource } from 'typeorm';

import type { SpecialistProfileRow } from '../../../db/specialist-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { SpecialistEventOutbox } from '../../ports/specialist-event-outbox.js';
import type { SpecialistReadRepository, SpecialistWriteRepository } from '../../ports/specialist-repositories.js';
import type { UpdateMySpecialistProfileCommand } from './update-my-specialist-profile.command.js';

const PUBLISHABLE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published'],
  published: ['draft'],
  suspended: [],
};

export class UpdateMySpecialistProfileHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reads: SpecialistReadRepository,
    private readonly writes: SpecialistWriteRepository,
    private readonly outbox: SpecialistEventOutbox,
  ) {}

  execute(command: UpdateMySpecialistProfileCommand): Promise<SpecialistProfileRow> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.reads.findByUserIdWithManager(manager, command.userId);
      if (!existing) {
        throw new AppError('This user does not have a specialist profile yet', 404);
      }

      const fromStatus = existing.status;
      if (command.patch.status && command.patch.status !== fromStatus) {
        if (!(PUBLISHABLE_TRANSITIONS[fromStatus] ?? []).includes(command.patch.status)) {
          throw new AppError(
            fromStatus === 'suspended'
              ? 'This specialist profile has been suspended and cannot be republished'
              : `Cannot change status from "${fromStatus}" to "${command.patch.status}"`,
            409,
          );
        }
      }

      const updated = await this.writes.update(manager, command.userId, command.patch);

      if (updated.status !== fromStatus) {
        await this.writes.insertStatusHistory(manager, {
          specialistProfileId: updated.id,
          fromStatus,
          toStatus: updated.status,
          changedByUserId: command.userId,
        });
      }

      await this.outbox.record(manager, {
        type: 'specialist.updated',
        aggregateId: updated.id,
        correlationId: command.correlationId ?? null,
        payload: { specialistProfileId: updated.id, userId: command.userId, status: updated.status },
      });

      return updated;
    });
  }
}
