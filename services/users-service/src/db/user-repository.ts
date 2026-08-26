import type { DataSource, EntityManager } from 'typeorm';

import { UserProfileEntity } from './entities/user-profile.entity.js';
import { UserEntity } from './entities/user.entity.js';

export interface UserProfileRow {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfileRaw {
  id: string;
  email: string | null;
  status: string;
  userCreatedAt: Date;
  name: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  updatedAt: Date;
}

type Queryable = DataSource | EntityManager;

function toProfileRow(row: UserProfileRaw): UserProfileRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    city: row.city,
    bio: row.bio,
    status: row.status,
    createdAt: row.userCreatedAt,
    updatedAt: row.updatedAt,
  };
}

export class UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  withTransaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  /**
   * Idempotent: `orIgnore()` means a redelivered `auth.user_registered` event
   * never overwrites or duplicates the profile.
   */
  async createProfileIfMissing(
    manager: EntityManager,
    input: { userId: string; email: string; name: string },
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(UserEntity)
      .values({ id: input.userId, email: input.email })
      .orIgnore()
      .execute();

    await manager
      .createQueryBuilder()
      .insert()
      .into(UserProfileEntity)
      .values({ userId: input.userId, name: input.name })
      .orIgnore()
      .execute();
  }

  async findById(userId: string): Promise<UserProfileRow | null> {
    const row = await this.findProfileRow(this.dataSource, userId);
    return row ? toProfileRow(row) : null;
  }

  async updateProfile(
    manager: EntityManager,
    userId: string,
    patch: { name?: string; phone?: string | null; city?: string | null; bio?: string | null },
  ): Promise<UserProfileRow | null> {
    if (Object.keys(patch).length > 0) {
      await manager.getRepository(UserProfileEntity).update({ userId }, { ...patch, updatedAt: new Date() });
    }
    const row = await this.findProfileRow(manager, userId);
    return row ? toProfileRow(row) : null;
  }

  async createProfileFromPatch(
    manager: EntityManager,
    userId: string,
    patch: { name: string; phone?: string | null; city?: string | null; bio?: string | null },
  ): Promise<UserProfileRow | null> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(UserEntity)
      .values({ id: userId })
      .orIgnore()
      .execute();

    await manager
      .createQueryBuilder()
      .insert()
      .into(UserProfileEntity)
      .values({
        userId,
        name: patch.name,
        phone: patch.phone ?? null,
        city: patch.city ?? null,
        bio: patch.bio ?? null,
      })
      .orIgnore()
      .execute();

    return this.updateProfile(manager, userId, patch);
  }

  private async findProfileRow(client: Queryable, userId: string): Promise<UserProfileRaw | null> {
    const rows = await client.query(
      `
        SELECT
          u."id" AS "id",
          u."email" AS "email",
          u."status" AS "status",
          u."createdAt" AS "userCreatedAt",
          p."name" AS "name",
          p."phone" AS "phone",
          p."city" AS "city",
          p."bio" AS "bio",
          p."updatedAt" AS "updatedAt"
        FROM users_schema.users u
        INNER JOIN users_schema.user_profiles p ON p."userId" = u."id"
        WHERE u."id" = $1
      `,
      [userId],
    );
    return rows[0] ?? null;
  }
}
