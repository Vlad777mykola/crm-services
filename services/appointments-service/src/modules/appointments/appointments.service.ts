import type { DataSource } from 'typeorm';

import { AppointmentCommands } from '../../application/commands/appointment-commands.js';
import { AppointmentQueries } from '../../application/queries/appointment-queries.js';
import { TypeOrmAppointmentEventOutbox } from '../../application/services/typeorm-appointment-event-outbox.js';
import type { AppointmentResponse } from '../../application/view-models/appointment-response.js';
import { AppointmentRepository } from '../../db/appointment-repository.js';
import { AvailabilityRepository } from '../../db/availability-repository.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AvailabilityService, type AvailabilitySlot } from '../availability/application/availability.service.js';
import type {
  AvailableSlotsQueryInput,
  CreateAppointmentInput,
  CreateTimeBlockInput,
  ListAppointmentsQueryInput,
  RespondToAppointmentInput,
  RescheduleAppointmentInput,
  SetAvailabilityRulesInput,
} from './appointments.schemas.js';

export class AppointmentsService {
  private readonly commands: AppointmentCommands;
  private readonly queries: AppointmentQueries;
  private readonly availability: AvailabilityService;

  constructor(dataSource: DataSource) {
    const appointments = new AppointmentRepository(dataSource);
    const projections = new ProjectionsRepository(dataSource);
    this.availability = new AvailabilityService(new AvailabilityRepository(dataSource), projections);
    this.commands = new AppointmentCommands(
      appointments,
      projections,
      new TypeOrmAppointmentEventOutbox(),
      this.availability,
    );
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

  async listForCompany(
    companyId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput = {},
  ): Promise<AppointmentResponse[]> {
    return this.queries.listForCompany(companyId, requesterUserId, input);
  }

  async listPendingForCompany(companyId: string, requesterUserId: string): Promise<AppointmentResponse[]> {
    return this.queries.listPendingForCompany(companyId, requesterUserId);
  }

  async listForClient(clientUserId: string, input: ListAppointmentsQueryInput = {}): Promise<AppointmentResponse[]> {
    return this.queries.listForClient(clientUserId, input);
  }

  async listForSpecialist(
    specialistProfileId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput,
  ): Promise<AppointmentResponse[]> {
    return this.queries.listForSpecialist(specialistProfileId, requesterUserId, input);
  }

  async getById(appointmentId: string, requesterUserId: string): Promise<AppointmentResponse> {
    return this.queries.getById(appointmentId, requesterUserId);
  }

  async listAvailableSlots(input: AvailableSlotsQueryInput): Promise<AvailabilitySlot[]> {
    return this.availability.listAvailableSlots({
      ...input,
      from: new Date(input.from),
      to: new Date(input.to),
    });
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

  async reschedule(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: RescheduleAppointmentInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.commands.reschedule(companyId, appointmentId, requesterUserId, input, correlationId);
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

  async getCompanyAvailability(companyId: string, requesterUserId: string) {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.getCompanyAvailability(companyId);
  }

  async setCompanyAvailability(companyId: string, requesterUserId: string, input: SetAvailabilityRulesInput) {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.setCompanyAvailability(companyId, input.rules);
  }

  async addCompanyTimeBlock(companyId: string, requesterUserId: string, input: CreateTimeBlockInput) {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.addCompanyTimeBlock({
      companyId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      reason: input.reason ?? null,
      createdByUserId: requesterUserId,
    });
  }

  async removeCompanyTimeBlock(companyId: string, requesterUserId: string, blockId: string): Promise<void> {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    await this.availability.removeCompanyTimeBlock(companyId, blockId);
  }

  async getSpecialistAvailability(companyId: string, specialistProfileId: string, requesterUserId: string) {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.getSpecialistAvailability(companyId, specialistProfileId);
  }

  async setSpecialistAvailability(
    companyId: string,
    specialistProfileId: string,
    requesterUserId: string,
    input: SetAvailabilityRulesInput,
  ) {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.setSpecialistAvailability(companyId, specialistProfileId, input.rules);
  }

  async addSpecialistTimeBlock(
    companyId: string,
    specialistProfileId: string,
    requesterUserId: string,
    input: CreateTimeBlockInput,
  ) {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.addSpecialistTimeBlock({
      companyId,
      specialistProfileId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      reason: input.reason ?? null,
      createdByUserId: requesterUserId,
    });
  }

  async removeSpecialistTimeBlock(
    companyId: string,
    specialistProfileId: string,
    requesterUserId: string,
    blockId: string,
  ): Promise<void> {
    await this.queries.ensureCanManageCompany(companyId, requesterUserId);
    await this.availability.removeSpecialistTimeBlock(companyId, specialistProfileId, blockId);
  }
}
