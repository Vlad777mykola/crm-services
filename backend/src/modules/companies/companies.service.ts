import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { requireCompanyRole } from '@/common/permissions/companyPermissions.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { CompanyMember, CompanyMemberRole, CompanyMemberStatus } from '@/modules/company-members/company-member.entity.js';

import { Company, CompanyStatus } from './company.entity.js';
import type { CreateCompanyRequestInput, UpdateCompanyRequestInput } from './companies.schemas.js';

export interface CompanyMembership {
  role: CompanyMemberRole;
  company: Company;
}

function getCompanyRepository(): Repository<Company> {
  return AppDataSource.getRepository(Company);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'company';
}

async function generateUniqueSlug(repository: Repository<Company>, name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;

  while (await repository.findOne({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function createCompany(input: CreateCompanyRequestInput, creatorUserId: string): Promise<Company> {
  return AppDataSource.transaction(async (manager) => {
    const companyRepository = manager.getRepository(Company);
    const memberRepository = manager.getRepository(CompanyMember);

    const slug = await generateUniqueSlug(companyRepository, input.name);

    const company = await companyRepository.save(
      companyRepository.create({
        name: input.name,
        slug,
        description: input.description ?? null,
        category: input.category ?? null,
        website: input.website ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        status: CompanyStatus.DRAFT,
        isRemoteSupported: input.isRemoteSupported ?? false,
        city: input.city ?? null,
        address: input.address ?? null,
        createdByUserId: creatorUserId,
      }),
    );

    await memberRepository.save(
      memberRepository.create({
        companyId: company.id,
        userId: creatorUserId,
        role: CompanyMemberRole.OWNER,
        status: CompanyMemberStatus.ACTIVE,
      }),
    );

    return company;
  });
}

export async function getPublicCompanies(): Promise<Company[]> {
  const repository = getCompanyRepository();
  return repository.find({ where: { status: CompanyStatus.PUBLISHED }, order: { createdAt: 'DESC' } });
}

export async function getMyCompanies(userId: string): Promise<CompanyMembership[]> {
  const memberRepository = AppDataSource.getRepository(CompanyMember);

  const memberships = await memberRepository.find({
    where: { userId, status: CompanyMemberStatus.ACTIVE },
    relations: { company: true },
    order: { createdAt: 'DESC' },
  });

  return memberships.map((membership) => ({ role: membership.role, company: membership.company }));
}

export async function getCompanyById(companyId: string, requesterUserId: string | undefined): Promise<Company> {
  const repository = getCompanyRepository();
  const company = await repository.findOne({ where: { id: companyId } });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  if (company.status === CompanyStatus.PUBLISHED) {
    return company;
  }

  // Draft/suspended companies are only visible to their active members - report
  // "not found" (rather than 403) so anonymous visitors can't detect their existence.
  const memberRepository = AppDataSource.getRepository(CompanyMember);
  const membership = requesterUserId
    ? await memberRepository.findOne({
        where: { companyId, userId: requesterUserId, status: CompanyMemberStatus.ACTIVE },
      })
    : null;

  if (!membership) {
    throw new AppError('Company not found', 404);
  }

  return company;
}

export async function updateCompany(
  companyId: string,
  requesterUserId: string,
  patch: UpdateCompanyRequestInput,
): Promise<Company> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getCompanyRepository();
  const company = await repository.findOne({ where: { id: companyId } });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  Object.assign(company, patch);
  return repository.save(company);
}
