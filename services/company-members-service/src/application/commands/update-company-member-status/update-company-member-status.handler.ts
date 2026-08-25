import type { DataSource } from 'typeorm';

import type { MemberRow } from '../../../db/member-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { CompanyMemberEventOutbox } from '../../ports/company-member-event-outbox.js';
import type { MemberReadRepository, MemberWriteRepository } from '../../ports/member-repositories.js';
import { assertCanTarget, requireRole } from '../../services/member-guards.js';
import type { UpdateCompanyMemberStatusCommand } from './update-company-member-status.command.js';

export class UpdateCompanyMemberStatusHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly membersRead: MemberReadRepository,
    private readonly membersWrite: MemberWriteRepository,
    private readonly outbox: CompanyMemberEventOutbox,
  ) {}

  async execute(command: UpdateCompanyMemberStatusCommand): Promise<MemberRow> {
    await requireRole(this.membersRead, command.companyId, command.requesterUserId, ['owner']);

    const member = await this.membersRead.findById(command.companyId, command.memberId);
    if (!member) {
      throw new AppError('Member not found', 404);
    }
    assertCanTarget(member);

    return this.dataSource.transaction(async (manager) => {
      const updated = await this.membersWrite.setStatus(manager, command.memberId, command.status);
      if (command.status === 'removed') {
        await this.outbox.record(manager, {
          type: 'company-member.removed',
          aggregateId: command.memberId,
          correlationId: command.correlationId ?? null,
          payload: { companyId: command.companyId, userId: updated.userId },
        });
      }
      return updated;
    });
  }
}
