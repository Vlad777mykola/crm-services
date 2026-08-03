import { AppError } from '@/common/errors/AppError.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { CompanyMember, CompanyMemberRole, CompanyMemberStatus } from '@/modules/company-members/company-member.entity.js';

/**
 * Looks up the requester's active membership for a company. Returns `null`
 * instead of throwing so callers can decide between a 403 (member-only
 * mutation) and a 404 (member-visible-only read) response.
 */
export async function findActiveCompanyMembership(
  companyId: string,
  userId: string,
): Promise<CompanyMember | null> {
  const repository = AppDataSource.getRepository(CompanyMember);
  return repository.findOne({
    where: { companyId, userId, status: CompanyMemberStatus.ACTIVE },
  });
}

/** Throws a 403 unless the user is an active member with one of `allowedRoles`. */
export async function requireCompanyRole(
  companyId: string,
  userId: string,
  allowedRoles: CompanyMemberRole[],
): Promise<CompanyMember> {
  const membership = await findActiveCompanyMembership(companyId, userId);

  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new AppError('You do not have permission to manage this company', 403);
  }

  return membership;
}
