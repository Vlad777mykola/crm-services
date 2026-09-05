/**
 * Mirrors `contracts/permissions/actions.ts` (the documented source of
 * truth). Re-declared here because `contracts/` is not a workspace package -
 * see that file's header comment for why. Keep both in sync by hand.
 */

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
