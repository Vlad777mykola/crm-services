import type { DataSource } from 'typeorm';

import { ChangeCompanyMemberRoleHandler } from '../../application/commands/change-company-member-role/change-company-member-role.handler.js';
import { InviteCompanyMemberHandler } from '../../application/commands/invite-company-member/invite-company-member.handler.js';
import { UpdateCompanyMemberStatusHandler } from '../../application/commands/update-company-member-status/update-company-member-status.handler.js';
import { ListCompanyMembersHandler } from '../../application/queries/list-company-members/list-company-members.handler.js';
import { TypeOrmCompanyMemberEventOutbox } from '../../application/services/typeorm-company-member-event-outbox.js';
import { TypeOrmUserLookup } from '../../application/services/typeorm-user-lookup.js';
import type { MemberWithUser } from '../../application/view-models/member-with-user.js';
import type { MemberRole, MemberRow } from '../../db/member-repository.js';
import { MemberRepository } from '../../db/member-repository.js';

export class MembersService {
  private readonly inviteCommand: InviteCompanyMemberHandler;
  private readonly listQuery: ListCompanyMembersHandler;
  private readonly updateStatusCommand: UpdateCompanyMemberStatusHandler;
  private readonly changeRoleCommand: ChangeCompanyMemberRoleHandler;

  constructor(dataSource: DataSource) {
    const members = new MemberRepository(dataSource);
    const users = new TypeOrmUserLookup(dataSource);
    const outbox = new TypeOrmCompanyMemberEventOutbox();
    this.inviteCommand = new InviteCompanyMemberHandler(dataSource, members, members, users, outbox);
    this.listQuery = new ListCompanyMembersHandler(members, users);
    this.updateStatusCommand = new UpdateCompanyMemberStatusHandler(dataSource, members, members, outbox);
    this.changeRoleCommand = new ChangeCompanyMemberRoleHandler(dataSource, members, members, outbox);
  }

  async list(companyId: string, requesterUserId: string): Promise<MemberWithUser[]> {
    return this.listQuery.execute({ companyId, requesterUserId });
  }

  async invite(companyId: string, requesterUserId: string, email: string, correlationId?: string): Promise<MemberWithUser> {
    return this.inviteCommand.execute({ companyId, requesterUserId, email, correlationId });
  }

  async updateStatus(
    companyId: string,
    requesterUserId: string,
    memberId: string,
    status: 'active' | 'removed',
    correlationId?: string,
  ): Promise<MemberRow> {
    return this.updateStatusCommand.execute({ companyId, requesterUserId, memberId, status, correlationId });
  }

  async remove(companyId: string, requesterUserId: string, memberId: string, correlationId?: string): Promise<MemberRow> {
    return this.updateStatus(companyId, requesterUserId, memberId, 'removed', correlationId);
  }

  async changeRole(
    companyId: string,
    requesterUserId: string,
    memberId: string,
    role: MemberRole,
    correlationId?: string,
  ): Promise<MemberRow> {
    return this.changeRoleCommand.execute({ companyId, requesterUserId, memberId, role, correlationId });
  }
}
