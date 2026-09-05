import type { RescheduleAppointmentInput } from '../../../modules/appointments/appointments.schemas.js';

export interface RescheduleAppointmentCommand {
  companyId: string;
  appointmentId: string;
  requesterUserId: string;
  input: RescheduleAppointmentInput;
  correlationId?: string;
}
