import type { DataSource } from 'typeorm';

import { findUserIdByEmail, findUserNamesByIds } from '../../db/member-repository.js';
import type { UserLookup, UserSummary } from '../ports/user-lookup.js';

export class TypeOrmUserLookup implements UserLookup {
  constructor(private readonly dataSource: DataSource) {}

  findUserIdByEmail(email: string): Promise<string | undefined> {
    return findUserIdByEmail(this.dataSource, email);
  }

  findUserNamesByIds(userIds: string[]): Promise<Map<string, UserSummary>> {
    return findUserNamesByIds(this.dataSource, userIds);
  }
}
