import { AppError } from '../../errors/AppError.js';

type TransitionMap = Record<string, string[]>;

// Copied as-is from backend/src/modules/audit/status-transition.ts -
// appointments-service owns this lifecycle now, legacy's copy is unchanged
// dead code once this route is cut over.
export const APPOINTMENT_STATUS_TRANSITIONS: TransitionMap = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

export function assertTransitionAllowed(from: string, to: string, message?: string): void {
  if (from === to) return;
  if (!(APPOINTMENT_STATUS_TRANSITIONS[from] ?? []).includes(to)) {
    throw new AppError(message ?? `Cannot change status from "${from}" to "${to}"`, 409);
  }
}
