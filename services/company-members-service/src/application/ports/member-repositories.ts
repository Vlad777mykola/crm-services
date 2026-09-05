import type { EntityManager } from 'typeorm';

import type { MemberRole, MemberRow, MemberStatus } from '../../db/member-repository.js';

export interface MemberReadRepository {
  findByCompanyAndUser(companyId: string, userId: string): Promise<MemberRow | null>;
  findById(companyId: string, memberId: string): Promise<MemberRow | null>;
  listByCompany(companyId: string): Promise<MemberRow[]>;
}

export interface MemberWriteRepository {
  insertOwner(manager: EntityManager, companyId: string, userId: string): Promise<MemberRow | null>;
  setStatus(manager: EntityManager, memberId: string, status: MemberStatus): Promise<MemberRow>;
  setRole(manager: EntityManager, memberId: string, role: MemberRole): Promise<MemberRow>;
  upsertManager(
    manager: EntityManager,
    companyId: string,
    userId: string,
  ): Promise<{ row: MemberRow; wasReactivated: boolean }>;
}
