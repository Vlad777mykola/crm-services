import type { Pool } from 'pg';

import { AppError } from '../errors/AppError.js';

export type CompanyMemberRole = 'owner' | 'manager';
export type CompanyStatus = 'draft' | 'published' | 'suspended';
export type SpecialistProfileStatus = 'draft' | 'published' | 'suspended';

export interface AppDashboardSummary {
  roles: Array<'client' | 'company' | 'specialist'>;
  unreadNotifications: number;
  appointments: {
    pending: number;
    approved: number;
    completed: number;
  };
  companies: Array<{
    id: string;
    name: string;
    status: CompanyStatus;
    role: CompanyMemberRole;
  }>;
  specialist: {
    id: string;
    status: SpecialistProfileStatus;
    pendingCompanyRequests: number;
    activeCompanies: number;
    assignedServices: number;
  } | null;
}

export interface CompanyDashboardSummary {
  company: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    status: CompanyStatus;
    isRemoteSupported: boolean;
    city: string | null;
    address: string | null;
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
  };
  role: CompanyMemberRole;
  pendingAppointments: number;
  activeSpecialists: number;
  pendingSpecialistRequests: number;
  activeMembers: number;
  services: {
    total: number;
    draft: number;
    published: number;
  };
}

/**
 * Cross-schema read-only aggregation (Phase 15 Option B). Same response shape as
 * legacy dashboard.service.ts, but queries each owning service's schema directly.
 */
export class DashboardService {
  constructor(private readonly pool: Pool) {}

  async getAppDashboardSummary(userId: string): Promise<AppDashboardSummary> {
    const [
      unreadNotifications,
      memberships,
      specialist,
      pending,
      approved,
      completed,
    ] = await Promise.all([
      this.countUnreadNotifications(userId),
      this.listActiveMemberships(userId),
      this.findSpecialistByUserId(userId),
      this.countAppointments(userId, 'pending'),
      this.countAppointments(userId, 'approved'),
      this.countAppointments(userId, 'completed'),
    ]);

    const specialistSummary = specialist ? await this.buildSpecialistSummary(specialist) : null;

    const roles: AppDashboardSummary['roles'] = ['client'];
    if (memberships.length > 0) roles.push('company');
    if (specialist) roles.push('specialist');

    return {
      roles,
      unreadNotifications,
      appointments: { pending, approved, completed },
      companies: memberships,
      specialist: specialistSummary,
    };
  }

  async getCompanyDashboardSummary(companyId: string, userId: string): Promise<CompanyDashboardSummary> {
    const membership = await this.findActiveMembershipRole(companyId, userId);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'manager')) {
      throw new AppError('Forbidden', 403);
    }

    const company = await this.findCompanyById(companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const [
      pendingAppointments,
      activeSpecialists,
      pendingSpecialistRequests,
      activeMembers,
      totalServices,
      draftServices,
      publishedServices,
    ] = await Promise.all([
      this.countCompanyAppointments(companyId, 'pending'),
      this.countCompanySpecialists(companyId, 'active'),
      this.countCompanySpecialistRequests(companyId, 'pending'),
      this.countCompanyMembers(companyId),
      this.countServices(companyId),
      this.countServices(companyId, 'draft'),
      this.countServices(companyId, 'published'),
    ]);

    return {
      company,
      role: membership.role,
      pendingAppointments,
      activeSpecialists,
      pendingSpecialistRequests,
      activeMembers,
      services: {
        total: totalServices,
        draft: draftServices,
        published: publishedServices,
      },
    };
  }

  private async countUnreadNotifications(userId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM notifications_schema.notifications
       WHERE "userId" = $1 AND "isRead" = false`,
      [userId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async listActiveMemberships(userId: string): Promise<AppDashboardSummary['companies']> {
    const { rows } = await this.pool.query<{
      id: string;
      name: string;
      status: CompanyStatus;
      role: CompanyMemberRole;
    }>(
      `SELECT c."id", c."name", c."status", m."role"
       FROM company_members_schema.company_members m
       INNER JOIN companies_schema.companies c ON c."id" = m."companyId"
       WHERE m."userId" = $1 AND m."status" = 'active'
       ORDER BY m."createdAt" DESC`,
      [userId],
    );
    return rows;
  }

  private async findSpecialistByUserId(userId: string): Promise<{ id: string; status: SpecialistProfileStatus } | undefined> {
    const { rows } = await this.pool.query<{ id: string; status: SpecialistProfileStatus }>(
      `SELECT "id", "status" FROM specialists_schema.specialist_profiles WHERE "userId" = $1 LIMIT 1`,
      [userId],
    );
    return rows[0];
  }

  private async countAppointments(userId: string, status: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM appointments_schema.appointments
       WHERE "clientUserId" = $1 AND "status" = $2`,
      [userId, status],
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async buildSpecialistSummary(
    specialist: { id: string; status: SpecialistProfileStatus },
  ): Promise<NonNullable<AppDashboardSummary['specialist']>> {
    const [pendingCompanyRequests, activeCompanies, assignedServices] = await Promise.all([
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM company_specialists_schema.company_specialist_requests
         WHERE "specialistProfileId" = $1 AND "status" = 'pending'`,
        [specialist.id],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM company_specialists_schema.company_specialists
         WHERE "specialistProfileId" = $1 AND "status" = 'active'`,
        [specialist.id],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM services_schema.service_specialists
         WHERE "specialistProfileId" = $1`,
        [specialist.id],
      ),
    ]);

    return {
      id: specialist.id,
      status: specialist.status,
      pendingCompanyRequests: Number(pendingCompanyRequests.rows[0]?.count ?? 0),
      activeCompanies: Number(activeCompanies.rows[0]?.count ?? 0),
      assignedServices: Number(assignedServices.rows[0]?.count ?? 0),
    };
  }

  private async findActiveMembershipRole(
    companyId: string,
    userId: string,
  ): Promise<{ role: CompanyMemberRole } | undefined> {
    const { rows } = await this.pool.query<{ role: CompanyMemberRole }>(
      `SELECT "role" FROM company_members_schema.company_members
       WHERE "companyId" = $1 AND "userId" = $2 AND "status" = 'active' LIMIT 1`,
      [companyId, userId],
    );
    return rows[0];
  }

  private async findCompanyById(companyId: string): Promise<CompanyDashboardSummary['company'] | undefined> {
    const { rows } = await this.pool.query<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      category: string | null;
      website: string | null;
      phone: string | null;
      email: string | null;
      status: CompanyStatus;
      isRemoteSupported: boolean;
      city: string | null;
      address: string | null;
      createdByUserId: string;
      createdAt: Date;
      updatedAt: Date;
    }>(`SELECT * FROM companies_schema.companies WHERE "id" = $1`, [companyId]);

    const row = rows[0];
    if (!row) return undefined;

    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async countCompanyAppointments(companyId: string, status: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM appointments_schema.appointments
       WHERE "companyId" = $1 AND "status" = $2`,
      [companyId, status],
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async countCompanySpecialists(companyId: string, status: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM company_specialists_schema.company_specialists
       WHERE "companyId" = $1 AND "status" = $2`,
      [companyId, status],
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async countCompanySpecialistRequests(companyId: string, status: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM company_specialists_schema.company_specialist_requests
       WHERE "companyId" = $1 AND "status" = $2`,
      [companyId, status],
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async countCompanyMembers(companyId: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM company_members_schema.company_members
       WHERE "companyId" = $1 AND "status" = 'active'`,
      [companyId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async countServices(companyId: string, status?: string): Promise<number> {
    if (status) {
      const { rows } = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM services_schema.services
         WHERE "companyId" = $1 AND "status" = $2`,
        [companyId, status],
      );
      return Number(rows[0]?.count ?? 0);
    }

    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM services_schema.services WHERE "companyId" = $1`,
      [companyId],
    );
    return Number(rows[0]?.count ?? 0);
  }
}
