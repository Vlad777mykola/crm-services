import type { DataSource, EntityManager } from 'typeorm';

import { MemberEntity, type MemberRow, type MemberStatus } from './entities/member.entity.js';

export type { MemberRole, MemberRow, MemberStatus } from './entities/member.entity.js';

export class MemberRepository {
  constructor(private readonly dataSource: DataSource) {}

  async insertOwner(manager: EntityManager, companyId: string, userId: string): Promise<MemberRow | null> {
    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(MemberEntity)
      .values({ companyId, userId, role: 'owner', status: 'active' })
      .orIgnore()
      .returning('*')
      .execute();

    return (result.raw[0] as MemberRow | undefined) ?? null;
  }

  async findByCompanyAndUser(companyId: string, userId: string): Promise<MemberRow | null> {
    return this.dataSource.getRepository(MemberEntity).findOne({ where: { companyId, userId } });
  }

  async findById(companyId: string, memberId: string): Promise<MemberRow | null> {
    return this.dataSource.getRepository(MemberEntity).findOne({ where: { id: memberId, companyId } });
  }

  async listByCompany(companyId: string): Promise<MemberRow[]> {
    return this.dataSource.getRepository(MemberEntity).find({
      where: { companyId },
      order: { createdAt: 'ASC' },
    });
  }

  async upsertManager(
    manager: EntityManager,
    companyId: string,
    userId: string,
  ): Promise<{ row: MemberRow; wasReactivated: boolean }> {
    const repository = manager.getRepository(MemberEntity);
    const existing = await repository.findOne({ where: { companyId, userId } });

    if (existing) {
      const row = await repository.save(repository.merge(existing, { status: 'active', role: 'manager', updatedAt: new Date() }));
      return { row, wasReactivated: true };
    }

    const row = await repository.save(repository.create({ companyId, userId, role: 'manager', status: 'active' }));
    return { row, wasReactivated: false };
  }

  async setStatus(manager: EntityManager, memberId: string, status: MemberStatus): Promise<MemberRow> {
    const repository = manager.getRepository(MemberEntity);
    const existing = await repository.findOneOrFail({ where: { id: memberId } });
    return repository.save(repository.merge(existing, { status, updatedAt: new Date() }));
  }
}

/**
 * TEMPORARY, EXPLICITLY FLAGGED CROSS-SCHEMA READ.
 */
export async function findUserIdByEmail(dataSource: DataSource, email: string): Promise<string | undefined> {
  const rows = await dataSource.query<Array<{ id: string }>>(
    `SELECT "id" FROM users_schema.users WHERE "email" = $1 LIMIT 1`,
    [email],
  );
  return rows[0]?.id;
}

export async function findUserNamesByIds(
  dataSource: DataSource,
  userIds: string[],
): Promise<Map<string, { name: string; email: string | null }>> {
  if (userIds.length === 0) return new Map();
  const rows = await dataSource.query<Array<{ id: string; email: string | null; name: string }>>(
    `SELECT u."id", u."email", p."name" FROM users_schema.users u
     JOIN users_schema.user_profiles p ON p."userId" = u."id"
     WHERE u."id" = ANY($1)`,
    [userIds],
  );
  return new Map(rows.map((r) => [r.id, { name: r.name, email: r.email }]));
}
