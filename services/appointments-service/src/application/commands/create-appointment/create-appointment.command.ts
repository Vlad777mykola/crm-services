import type { CreateAppointmentInput } from '../../../modules/appointments/appointments.schemas.js';

export interface CreateAppointmentCommand {
  companyId: string;
  clientUserId: string;
  input: CreateAppointmentInput;
  correlationId?: string;
}
