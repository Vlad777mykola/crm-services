export interface AppointmentRequestedPayload {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  requestedStartAt: string;
}

export interface AppointmentRespondedPayload {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  clientUserId: string;
  companyName: string;
  serviceName: string;
  requestedStartAt: string;
}

export interface AppointmentCompletedPayload {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  clientUserId: string;
  companyName: string;
  serviceName: string;
}

export interface AppointmentCancelledPayload {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  requestedStartAt: string;
}

export interface ReviewReceivedPayload {
  reviewId: string;
  companyId: string;
  serviceId: string;
  serviceName: string;
  rating: number;
  comment: string | null;
}

/**
 * Central domain-event contract. Payloads use JSON-safe primitives so the
 * in-process adapter can later be replaced by a queue without changing
 * publishers or subscribers.
 */
export interface DomainEventMap {
  'appointment.requested': AppointmentRequestedPayload;
  'appointment.approved': AppointmentRespondedPayload;
  'appointment.rejected': AppointmentRespondedPayload;
  'appointment.completed': AppointmentCompletedPayload;
  'appointment.cancelled': AppointmentCancelledPayload;
  'review.received': ReviewReceivedPayload;
}

export type DomainEventName = keyof DomainEventMap;

export interface DomainEventEnvelope<Name extends DomainEventName = DomainEventName> {
  id: string;
  type: Name;
  occurredAt: string;
  payload: DomainEventMap[Name];
}
