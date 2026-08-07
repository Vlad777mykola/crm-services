import type { DomainEventDataMap, WireEventEnvelope } from '../wire-event.js';

export type EmailRecipientSpec = { kind: 'company-managers'; companyId: string } | { kind: 'user'; userId: string };

/**
 * Pure mapping from a domain event to *who* should receive the notification/
 * (simulated) email about it. The handler resolves the spec to concrete
 * users/emails against this service's own read-only queries.
 */
export function resolveEmailRecipient(event: WireEventEnvelope): EmailRecipientSpec | null {
  switch (event.type) {
    case 'appointment.requested':
    case 'appointment.cancelled':
    case 'review.received': {
      const { companyId } = event.data as { companyId: string };
      return { kind: 'company-managers', companyId };
    }
    case 'appointment.approved':
    case 'appointment.rejected':
    case 'appointment.completed': {
      const { clientUserId } = event.data as DomainEventDataMap['appointment.approved'];
      return { kind: 'user', userId: clientUserId };
    }
    default:
      return null;
  }
}
