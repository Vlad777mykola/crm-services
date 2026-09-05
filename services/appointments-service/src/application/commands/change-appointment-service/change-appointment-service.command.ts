export interface ChangeAppointmentServiceCommand {
  companyId: string;
  appointmentId: string;
  requesterUserId: string;
  serviceId: string;
  correlationId?: string;
}
