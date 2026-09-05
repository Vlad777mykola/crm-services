/**
 * Canonical permission/action vocabulary for the CRM platform.
 *
 * This file is documentation + the source of truth for naming, mirroring how
 * `contracts/events/*.json` and `contracts/openapi/**` document event and API
 * shapes without being imported at runtime (see `scripts/ci/validate-event-contracts.mjs`
 * for the equivalent pattern on events). `contracts/` is not a workspace
 * package, so runtime code does not `import` this file directly - each
 * service/package that needs these names re-declares the same string
 * literals (see `services/authz-kit/src/actions.ts`). Keep both in sync by
 * hand; there is no cross-service permission check to keep DRY at runtime.
 *
 * Action names are `<domain>.<resource>.<verb>` and are stable identifiers -
 * do not rename without a migration plan for anything already persisted or
 * returned to a client (dashboard summary `permissions[]`, future
 * `x-required-permissions` OpenAPI extension, etc).
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
