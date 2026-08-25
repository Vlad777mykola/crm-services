import type { DataSource } from 'typeorm';

import { AppointmentCommands } from '../../application/commands/appointment-commands.js';
import { AppointmentQueries } from '../../application/queries/appointment-queries.js';
import { TypeOrmAppointmentEventOutbox } from '../../application/services/typeorm-appointment-event-outbox.js';
import type { AppointmentResponse } from '../../application/view-models/appointment-response.js';
import { AppointmentRepository } from '../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import type { CreateAppointmentInput, RespondToAppointmentInput } from './appointments.schemas.js';

export class AppointmentsService {
  private readonly commands: AppointmentCommands;
  private readonly queries: AppointmentQueries;

  constructor(dataSource: DataSource) {
    const appointments = new AppointmentRepository(dataSource);
    const projections = new ProjectionsRepository(dataSource);
    this.commands = new AppointmentCommands(appointments, projections, new TypeOrmAppointmentEventOutbox());
    this.queries = new AppointmentQueries(appointments, projections);
  }

  async create(
    companyId: string,
    clientUserId: string,
    input: CreateAppointmentInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.commands.create(companyId, clientUserId, input, correlationId);
  }

  async listForCompany(companyId: string, requesterUserId: string): Promise<AppointmentResponse[]> {
    return this.queries.listForCompany(companyId, requesterUserId);
  }

  async listForClient(clientUserId: string): Promise<AppointmentResponse[]> {
    return this.queries.listForClient(clientUserId);
  }

  async respond(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: RespondToAppointmentInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.commands.respond(companyId, appointmentId, requesterUserId, input, correlationId);
  }

  async complete(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.commands.complete(companyId, appointmentId, requesterUserId, correlationId);
  }

  async getStatusHistory(appointmentId: string, requesterUserId: string) {
    return this.queries.getStatusHistory(appointmentId, requesterUserId);
  }

  async cancel(appointmentId: string, clientUserId: string, correlationId?: string): Promise<AppointmentResponse> {
    return this.commands.cancel(appointmentId, clientUserId, correlationId);
  }
}
