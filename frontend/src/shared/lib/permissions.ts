// Mirrors contracts/permissions/actions.ts by hand (see that file's header
// comment - contracts/ is documentation only, not an importable package).
// Keep in sync with services/authz-kit/src/actions.ts.

export const COMPANY_ACTIONS = [
  'company.members.invite',
  'company.members.remove',
  'company.members.change_role',
  'company.services.manage',
  'company.appointments.manage',
] as const;

export const APPOINTMENT_ACTIONS = [
  'appointments.view_own',
  'appointments.cancel_own',
  'appointments.approve',
  'appointments.reschedule',
] as const;

export const SPECIALIST_ACTIONS = [
  'specialist.availability.manage_own',
  'specialist.availability.manage_company',
  'specialist.appointments.view_own',
] as const;

export type CompanyAction = (typeof COMPANY_ACTIONS)[number];
export type AppointmentAction = (typeof APPOINTMENT_ACTIONS)[number];
export type SpecialistAction = (typeof SPECIALIST_ACTIONS)[number];
export type PermissionAction = CompanyAction | AppointmentAction | SpecialistAction;

export function hasPermission(permissions: PermissionAction[] | undefined, action: PermissionAction): boolean {
  return Boolean(permissions?.includes(action));
}

export function hasAnyPermission(permissions: PermissionAction[] | undefined, actions: PermissionAction[]): boolean {
  return actions.some((action) => hasPermission(permissions, action));
}
