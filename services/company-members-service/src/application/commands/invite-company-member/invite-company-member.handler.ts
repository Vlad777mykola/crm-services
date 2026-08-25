import type { DataSource } from 'typeorm';

import { AppError } from '../../../errors/AppError.js';
import type { CompanyMemberEventOutbox } from '../../ports/company-member-event-outbox.js';
import type { MemberReadRepository, MemberWriteRepository } from '../../ports/member-repositories.js';
import type { UserLookup } from '../../ports/user-lookup.js';
import { attachUsers } from '../../services/member-presenter.js';
import { requireRole } from '../../services/member-guards.js';
import type { MemberWithUser } from '../../view-models/member-with-user.js';
import type { InviteCompanyMemberCommand } from './invite-company-member.command.js';

export class InviteCompanyMemberHandler {
  constructor(
    private readonly dataSource: DataSource,
    private readonly membersRead: MemberReadRepository,
    private readonly membersWrite: MemberWriteRepository,
    private readonly users: UserLookup,
    private readonly outbox: CompanyMemberEventOutbox,
  ) {}

  async execute(command: InviteCompanyMemberCommand): Promise<MemberWithUser> {
    await requireRole(this.membersRead, command.companyId, command.requesterUserId, ['owner']);

    const invitedUserId = await this.users.findUserIdByEmail(command.email);
    if (!invitedUserId) {
      throw new AppError('No user found with this email', 404);
    }

    const existing = await this.membersRead.findByCompanyAndUser(command.companyId, invitedUserId);
    if (existing?.status === 'active') {
      throw new AppError('This user is already an active member of the company', 409);
    }

    return this.dataSource.transaction(async (manager) => {
      const { row } = await this.membersWrite.upsertManager(manager, command.companyId, invitedUserId);
      await this.outbox.record(manager, {
        type: 'company-member.added',
        aggregateId: row.id,
        payload: { companyId: command.companyId, userId: invitedUserId, role: row.role },
      });

      const [member] = await attachUsers(this.users, [row]);
      return member!;
    });
  }
}
