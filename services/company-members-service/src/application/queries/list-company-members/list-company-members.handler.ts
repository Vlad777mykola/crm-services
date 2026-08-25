import type { MemberReadRepository } from '../../ports/member-repositories.js';
import type { UserLookup } from '../../ports/user-lookup.js';
import { requireRole } from '../../services/member-guards.js';
import { attachUsers } from '../../services/member-presenter.js';
import type { MemberWithUser } from '../../view-models/member-with-user.js';
import type { ListCompanyMembersQuery } from './list-company-members.query.js';

export class ListCompanyMembersHandler {
  constructor(
    private readonly members: MemberReadRepository,
    private readonly users: UserLookup,
  ) {}

  async execute(query: ListCompanyMembersQuery): Promise<MemberWithUser[]> {
    await requireRole(this.members, query.companyId, query.requesterUserId, ['owner', 'manager']);
    const rows = await this.members.listByCompany(query.companyId);
    return attachUsers(this.users, rows);
  }
}
