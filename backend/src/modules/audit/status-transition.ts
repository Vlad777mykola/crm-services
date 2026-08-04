import { AppError } from '@/common/errors/AppError.js';

export type TransitionMap = Record<string, readonly string[]>;

/**
 * Central place to declare which status transitions are legal for a given
 * entity. Callers pass their own friendly error message so existing API
 * responses/docs are unaffected; the map itself is what gets hardened and
 * unit-tested, instead of the ad hoc `if (status !== X) throw` checks that
 * used to live inline in each service function.
 */
export function assertTransitionAllowed(allowed: TransitionMap, from: string, to: string, message?: string): void {
  if (from === to) {
    return;
  }

  if (!(allowed[from] ?? []).includes(to)) {
    throw new AppError(message ?? `Cannot change status from "${from}" to "${to}"`, 409);
  }
}

/**
 * Shared by companies, services, and specialist profiles - they all use the
 * same draft/published/suspended lifecycle. `suspended` is intentionally a
 * dead end here: it's a moderation-only state (not settable via the public
 * update schemas either), so once an entity is suspended, self-service PATCH
 * endpoints must not be able to republish it without a moderator action.
 */
export const PUBLISHABLE_STATUS_TRANSITIONS: TransitionMap = {
  draft: ['published'],
  published: ['draft'],
  suspended: [],
};

export const APPOINTMENT_STATUS_TRANSITIONS: TransitionMap = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};
