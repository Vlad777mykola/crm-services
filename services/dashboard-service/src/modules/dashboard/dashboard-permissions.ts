import type { PermissionAction } from '@crm/authz-kit';

import type { CompanyMemberRole } from './dashboard.service.js';

/**
 * Computed, not stored: these mirror the *actual* enforcement in each
 * owning service (company-members-service, appointments-service, etc.) so
 * the frontend can gate UI without a second source of truth for the rules
 * themselves. If enforcement changes, update this alongside it - there is no
 * automated cross-service check for this (same caveat as the permission
 * vocabulary in `contracts/permissions/actions.ts`).
 */
export function computeCompanyPermissions(role: CompanyMemberRole): PermissionAction[] {
  const permissions: PermissionAction[] = [
    'company.services.manage',
    'company.appointments.manage',
    'appointments.approve',
    'appointments.reschedule',
    'specialist.availability.manage_company',
  ];

  if (role === 'owner') {
    permissions.push('company.members.invite', 'company.members.remove', 'company.members.change_role');
  }

  return permissions;
}

/** Baseline permissions every authenticated user has over their own appointments. */
export function computeClientPermissions(): PermissionAction[] {
  return ['appointments.view_own', 'appointments.cancel_own'];
}

export function computeSpecialistPermissions(): PermissionAction[] {
  return ['specialist.availability.manage_own', 'specialist.appointments.view_own'];
}
