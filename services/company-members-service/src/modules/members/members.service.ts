import type { DataSource } from 'typeorm';

import { AppError } from '../../errors/AppError.js';
import type { MemberRow } from '../../db/member-repository.js';
import { findUserIdByEmail, findUserNamesByIds, MemberRepository } from '../../db/member-repository.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';

export interface MemberWithUser extends MemberRow {
  user: { id: string; name: string; email: string | null } | null;
}

export class MembersService {
  private readonly members: MemberRepository;

  constructor(private readonly dataSource: DataSource) {
    this.members = new MemberRepository(dataSource);
  }

  private async requireRole(companyId: string, userId: string, allowedRoles: Array<'owner' | 'manager'>): Promise<MemberRow> {
    const membership = await this.members.findByCompanyAndUser(companyId, userId);
    if (!membership || membership.status !== 'active' || !allowedRoles.includes(membership.role)) {
      throw new AppError('You do not have permission to manage this company', 403);
    }
    return membership;
  }

  async list(companyId: string, requesterUserId: string): Promise<MemberWithUser[]> {
    await this.requireRole(companyId, requesterUserId, ['owner', 'manager']);
    const rows = await this.members.listByCompany(companyId);
    const users = await findUserNamesByIds(this.dataSource, rows.map((r) => r.userId));
    return rows.map((row) => ({ ...row, user: users.get(row.userId) ? { id: row.userId, ...users.get(row.userId)! } : null }));
  }

  async invite(companyId: string, requesterUserId: string, email: string): Promise<MemberWithUser> {
    // Inviting/adding members is owner-only - managers cannot add other managers (legacy parity).
    await this.requireRole(companyId, requesterUserId, ['owner']);

    const invitedUserId = await findUserIdByEmail(this.dataSource, email);
    if (!invitedUserId) {
      throw new AppError('No user found with this email', 404);
    }

    const existing = await this.members.findByCompanyAndUser(companyId, invitedUserId);
    if (existing?.status === 'active') {
      throw new AppError('This user is already an active member of the company', 409);
    }

    return this.dataSource.transaction(async (manager) => {
      const { row } = await this.members.upsertManager(manager, companyId, invitedUserId);
      await recordOutboxEvent(manager, {
        type: 'company-member.added',
        aggregateId: row.id,
        payload: { companyId, userId: invitedUserId, role: row.role },
      });

      const users = await findUserNamesByIds(this.dataSource, [invitedUserId]);
      return { ...row, user: users.get(invitedUserId) ? { id: invitedUserId, ...users.get(invitedUserId)! } : null };
    });
  }

  private assertCanTarget(member: MemberRow): void {
    if (member.role === 'owner') {
      throw new AppError('The company owner cannot be modified or removed', 403);
    }
  }

  async updateStatus(companyId: string, requesterUserId: string, memberId: string, status: 'active' | 'removed'): Promise<MemberRow> {
    await this.requireRole(companyId, requesterUserId, ['owner']);

    const member = await this.members.findById(companyId, memberId);
    if (!member) throw new AppError('Member not found', 404);
    this.assertCanTarget(member);

    return this.dataSource.transaction(async (manager) => {
      const updated = await this.members.setStatus(manager, memberId, status);
      if (status === 'removed') {
        await recordOutboxEvent(manager, {
          type: 'company-member.removed',
          aggregateId: memberId,
          payload: { companyId, userId: updated.userId },
        });
      }
      return updated;
    });
  }

  async remove(companyId: string, requesterUserId: string, memberId: string): Promise<MemberRow> {
    return this.updateStatus(companyId, requesterUserId, memberId, 'removed');
  }
}
