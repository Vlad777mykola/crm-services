export interface CancelAppointmentCommand {
  appointmentId: string;
  clientUserId: string;
  correlationId?: string;
}
