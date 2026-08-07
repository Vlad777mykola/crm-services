import type { DomainEventDataMap, WireEventEnvelope } from '../wire-event.js';

export interface EmailContent {
  subject: string;
  body: string;
}

/**
 * Pure mapping from a domain event to the (simulated) email/notification
 * content we'd send about it. Kept free of RabbitMQ/DB concerns so it's
 * trivially unit-testable; the handler resolves the recipient and persists.
 */
export function buildEmailContent(event: WireEventEnvelope): EmailContent | null {
  switch (event.type) {
    case 'appointment.requested': {
      const { serviceName, clientName, requestedStartAt } = event.data as DomainEventDataMap['appointment.requested'];
      return {
        subject: `New appointment request for ${serviceName}`,
        body: `${clientName} requested ${serviceName} on ${new Date(requestedStartAt).toLocaleString()}.`,
      };
    }
    case 'appointment.approved': {
      const { serviceName, companyName, requestedStartAt } = event.data as DomainEventDataMap['appointment.approved'];
      return {
        subject: `Your appointment for ${serviceName} was approved`,
        body: `${companyName} confirmed your appointment on ${new Date(requestedStartAt).toLocaleString()}.`,
      };
    }
    case 'appointment.rejected': {
      const { serviceName, companyName, requestedStartAt } = event.data as DomainEventDataMap['appointment.rejected'];
      return {
        subject: `Your appointment for ${serviceName} was rejected`,
        body: `${companyName} was unable to confirm your request for ${new Date(requestedStartAt).toLocaleString()}.`,
      };
    }
    case 'appointment.completed': {
      const { serviceName, companyName } = event.data as DomainEventDataMap['appointment.completed'];
      return {
        subject: `Your appointment for ${serviceName} is complete`,
        body: `Let others know how it went - leave a review for ${companyName}.`,
      };
    }
    case 'appointment.cancelled': {
      const { serviceName, clientName, requestedStartAt } = event.data as DomainEventDataMap['appointment.cancelled'];
      return {
        subject: `Appointment for ${serviceName} was cancelled`,
        body: `${clientName} cancelled their request for ${new Date(requestedStartAt).toLocaleString()}.`,
      };
    }
    case 'review.received': {
      const { serviceName, rating, comment } = event.data as DomainEventDataMap['review.received'];
      return {
        subject: `New ${rating}-star review for ${serviceName}`,
        body: comment ?? 'No comment was left.',
      };
    }
    default:
      return null;
  }
}
