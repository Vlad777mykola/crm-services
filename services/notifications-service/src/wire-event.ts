/**
 * Local copy of the domain event payload shapes this service cares about -
 * mirrors contracts/events/*.v1.json. Deliberately not imported from
 * backend/src/infrastructure/events/domain-events.ts: this service must be
 * able to build and deploy without backend source ever being on its
 * filesystem - see docs/architecture/service-ownership.md.
 */
export interface AppointmentRequestedData {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  requestedStartAt: string;
}

export interface AppointmentRespondedData {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  clientUserId: string;
  companyName: string;
  serviceName: string;
  requestedStartAt: string;
}

export interface AppointmentCompletedData {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  clientUserId: string;
  companyName: string;
  serviceName: string;
}

export interface AppointmentCancelledData {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  requestedStartAt: string;
}

export interface ReviewReceivedData {
  reviewId: string;
  companyId: string;
  serviceId: string;
  serviceName: string;
  rating: number;
  comment: string | null;
}

export interface DomainEventDataMap {
  'appointment.requested': AppointmentRequestedData;
  'appointment.approved': AppointmentRespondedData;
  'appointment.rejected': AppointmentRespondedData;
  'appointment.completed': AppointmentCompletedData;
  'appointment.cancelled': AppointmentCancelledData;
  'review.received': ReviewReceivedData;
}

export type DomainEventType = keyof DomainEventDataMap;

/** Wire shape published under contracts/events/envelope.v1.json. */
export interface WireEventEnvelope<Name extends DomainEventType = DomainEventType> {
  id: string;
  type: Name;
  source: string;
  time: string;
  version: string;
  correlationId: string;
  data: DomainEventDataMap[Name];
}
