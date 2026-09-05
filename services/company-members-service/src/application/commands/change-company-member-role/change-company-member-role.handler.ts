import type { DataSource } from 'typeorm';

import type { MemberRow } from '../../../db/member-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { CompanyMemberEventOutbox } from '../../ports/company-member-event-outbox.js';
import type { MemberReadRepository, MemberWriteRepository } from '../../ports/member-repositories.js';
import { assertCanTarget, requireRole } from '../../services/member-guards.js';
import type { ChangeCompanyMemberRoleCommand } from './change-company-member-role.command.js';

export class ChangeCompanyMemberRoleHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly membersRead: MemberReadRepository,
    private readonly membersWrite: MemberWriteRepository,
    private readonly outbox: CompanyMemberEventOutbox,
  ) {}

  async execute(command: ChangeCompanyMemberRoleCommand): Promise<MemberRow> {
    await requireRole(this.membersRead, command.companyId, command.requesterUserId, ['owner']);

    if (command.role === 'owner') {
      // Promoting a member to owner would leave the company with two owners -
      // that's a distinct, higher-risk operation (ownership transfer), not a
      // plain role edit. Not supported here.
      throw new AppError('Promoting a member to owner is not supported by this endpoint', 409);
    }

    const member = await this.membersRead.findById(command.companyId, command.memberId);
    if (!member) {
      throw new AppError('Member not found', 404);
    }
    // Blocks demoting the current owner via this endpoint too.
    assertCanTarget(member);

    if (member.role === command.role) {
      return member;
    }

    return this.dataSource.transaction(async (manager) => {
      const updated = await this.membersWrite.setRole(manager, command.memberId, command.role);
      await this.outbox.record(manager, {
        type: 'company-member.role_changed',
        aggregateId: command.memberId,
        correlationId: command.correlationId ?? null,
        payload: {
          companyId: command.companyId,
          userId: updated.userId,
          fromRole: member.role,
          toRole: updated.role,
        },
      });
      return updated;
    });
  }
}
