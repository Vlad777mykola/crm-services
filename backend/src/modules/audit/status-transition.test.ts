import { describe, expect, it } from 'vitest';

import { AppError } from '@/common/errors/AppError.js';

import { APPOINTMENT_STATUS_TRANSITIONS, assertTransitionAllowed, PUBLISHABLE_STATUS_TRANSITIONS } from './status-transition.js';

describe('assertTransitionAllowed', () => {
  it('allows a same-status no-op update', () => {
    expect(() => assertTransitionAllowed(PUBLISHABLE_STATUS_TRANSITIONS, 'published', 'published')).not.toThrow();
  });

  it('allows publishing a draft', () => {
    expect(() => assertTransitionAllowed(PUBLISHABLE_STATUS_TRANSITIONS, 'draft', 'published')).not.toThrow();
  });

  it('allows unpublishing back to draft', () => {
    expect(() => assertTransitionAllowed(PUBLISHABLE_STATUS_TRANSITIONS, 'published', 'draft')).not.toThrow();
  });

  it('blocks a suspended entity from being republished directly', () => {
    expect(() => assertTransitionAllowed(PUBLISHABLE_STATUS_TRANSITIONS, 'suspended', 'published')).toThrow(AppError);
  });

  it('blocks a suspended entity from being reset to draft via self-service transitions', () => {
    expect(() => assertTransitionAllowed(PUBLISHABLE_STATUS_TRANSITIONS, 'suspended', 'draft')).toThrow(AppError);
  });

  it('uses the provided message when a transition is rejected', () => {
    expect(() => assertTransitionAllowed(PUBLISHABLE_STATUS_TRANSITIONS, 'suspended', 'published', 'Custom message')).toThrow(
      'Custom message',
    );
  });

  it('walks the appointment lifecycle: pending -> approved -> completed', () => {
    expect(() => assertTransitionAllowed(APPOINTMENT_STATUS_TRANSITIONS, 'pending', 'approved')).not.toThrow();
    expect(() => assertTransitionAllowed(APPOINTMENT_STATUS_TRANSITIONS, 'approved', 'completed')).not.toThrow();
  });

  it('rejects responding to an appointment twice', () => {
    expect(() => assertTransitionAllowed(APPOINTMENT_STATUS_TRANSITIONS, 'approved', 'rejected')).toThrow(AppError);
  });

  it('rejects completing an appointment that was never approved', () => {
    expect(() => assertTransitionAllowed(APPOINTMENT_STATUS_TRANSITIONS, 'pending', 'completed')).toThrow(AppError);
  });

  it('rejects cancelling an appointment that is already completed', () => {
    expect(() => assertTransitionAllowed(APPOINTMENT_STATUS_TRANSITIONS, 'completed', 'cancelled')).toThrow(AppError);
  });
});
