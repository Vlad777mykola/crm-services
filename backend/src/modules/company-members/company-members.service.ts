import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { requireCompanyRole } from '@/common/permissions/companyPermissions.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { User } from '@/modules/users/user.entity.js';

import { CompanyMember, CompanyMemberRole, CompanyMemberStatus } from './company-member.entity.js';
import type { UpdateMemberRequestInput } from './company-members.schemas.js';

function getMemberRepository(): Repository<CompanyMember> {
  return AppDataSource.getRepository(CompanyMember);
}

function assertCanTargetMember(member: CompanyMember): void {
  if (member.role === CompanyMemberRole.OWNER) {
    throw new AppError('The company owner cannot be modified or removed', 403);
  }
}

export async function listCompanyMembers(companyId: string, requesterUserId: string): Promise<CompanyMember[]> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getMemberRepository();
  return repository.find({
    where: { companyId },
    relations: { user: true },
    order: { createdAt: 'ASC' },
  });
}

export async function inviteCompanyMember(
  companyId: string,
  requesterUserId: string,
  email: string,
): Promise<CompanyMember> {
  // Managing members (inviting/removing) is owner-only; managers cannot add other managers.
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER]);

  const userRepository = AppDataSource.getRepository(User);
  const invitedUser = await userRepository.findOne({ where: { email } });
  if (!invitedUser) {
    throw new AppError('No user found with this email', 404);
  }

  const memberRepository = getMemberRepository();
  const existing = await memberRepository.findOne({ where: { companyId, userId: invitedUser.id } });

  if (existing) {
    if (existing.status === CompanyMemberStatus.ACTIVE) {
      throw new AppError('This user is already an active member of the company', 409);
    }

    // Re-inviting a previously removed member reactivates their manager membership.
    existing.status = CompanyMemberStatus.ACTIVE;
    existing.role = CompanyMemberRole.MANAGER;
    const reactivated = await memberRepository.save(existing);
    reactivated.user = invitedUser;
    return reactivated;
  }

  const member = await memberRepository.save(
    memberRepository.create({
      companyId,
      userId: invitedUser.id,
      role: CompanyMemberRole.MANAGER,
      status: CompanyMemberStatus.ACTIVE,
    }),
  );
  member.user = invitedUser;
  return member;
}

async function getMemberOrThrow(companyId: string, memberId: string): Promise<CompanyMember> {
  const repository = getMemberRepository();
  const member = await repository.findOne({ where: { id: memberId, companyId }, relations: { user: true } });
  if (!member) {
    throw new AppError('Member not found', 404);
  }
  return member;
}

export async function updateCompanyMember(
  companyId: string,
  requesterUserId: string,
  memberId: string,
  patch: UpdateMemberRequestInput,
): Promise<CompanyMember> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER]);

  const member = await getMemberOrThrow(companyId, memberId);
  assertCanTargetMember(member);

  member.status = patch.status as CompanyMemberStatus;
  return getMemberRepository().save(member);
}

export async function removeCompanyMember(
  companyId: string,
  requesterUserId: string,
  memberId: string,
): Promise<CompanyMember> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER]);

  const member = await getMemberOrThrow(companyId, memberId);
  assertCanTargetMember(member);

  member.status = CompanyMemberStatus.REMOVED;
  return getMemberRepository().save(member);
}
