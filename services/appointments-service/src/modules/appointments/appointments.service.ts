import type { DataSource } from 'typeorm';

import { ApproveAppointmentHandler } from '../../application/commands/approve-appointment/approve-appointment.handler.js';
import { CancelAppointmentHandler } from '../../application/commands/cancel-appointment/cancel-appointment.handler.js';
import { ChangeAppointmentServiceHandler } from '../../application/commands/change-appointment-service/change-appointment-service.handler.js';
import { CompleteAppointmentHandler } from '../../application/commands/complete-appointment/complete-appointment.handler.js';
import { CreateAppointmentHandler } from '../../application/commands/create-appointment/create-appointment.handler.js';
import { ReassignAppointmentSpecialistHandler } from '../../application/commands/reassign-appointment-specialist/reassign-appointment-specialist.handler.js';
import { RejectAppointmentHandler } from '../../application/commands/reject-appointment/reject-appointment.handler.js';
import { RescheduleAppointmentHandler } from '../../application/commands/reschedule-appointment/reschedule-appointment.handler.js';
import { UpdateAppointmentNotesHandler } from '../../application/commands/update-appointment-notes/update-appointment-notes.handler.js';
import { GetAppointmentDetailsHandler } from '../../application/queries/get-appointment-details/get-appointment-details.handler.js';
import { GetAppointmentStatusHistoryHandler } from '../../application/queries/get-appointment-status-history/get-appointment-status-history.handler.js';
import { ListClientAppointmentsHandler } from '../../application/queries/list-client-appointments/list-client-appointments.handler.js';
import { ListCompanyAppointmentsHandler } from '../../application/queries/list-company-appointments/list-company-appointments.handler.js';
import { ManageAppointmentAvailabilityHandler } from '../../application/queries/manage-appointment-availability/manage-appointment-availability.handler.js';
import { ListSpecialistAppointmentsHandler } from '../../application/queries/list-specialist-appointments/list-specialist-appointments.handler.js';
import { TypeOrmAppointmentEventOutbox } from '../../application/services/typeorm-appointment-event-outbox.js';
import type { AppointmentResponse } from '../../application/view-models/appointment-response.js';
import { AppointmentRepository } from '../../db/appointment-repository.js';
import { AvailabilityRepository } from '../../db/availability-repository.js';
import { ProjectionsRepository } from '../../db/projections-repository.js';
import { AvailabilityService, type AvailabilitySlot } from '../availability/application/availability.service.js';
import type {
  AvailableSlotsQueryInput,
  ChangeAppointmentServiceInput,
  CreateAppointmentInput,
  CreateTimeBlockInput,
  ListAppointmentsQueryInput,
  ReassignAppointmentSpecialistInput,
  RespondToAppointmentInput,
  RescheduleAppointmentInput,
  SetAvailabilityRulesInput,
  UpdateAppointmentNotesInput,
} from './appointments.schemas.js';

export class AppointmentsService {
  private readonly availability: AvailabilityService;

  private readonly createCommand: CreateAppointmentHandler;
  private readonly approveCommand: ApproveAppointmentHandler;
  private readonly rejectCommand: RejectAppointmentHandler;
  private readonly completeCommand: CompleteAppointmentHandler;
  private readonly cancelCommand: CancelAppointmentHandler;
  private readonly rescheduleCommand: RescheduleAppointmentHandler;
  private readonly reassignSpecialistCommand: ReassignAppointmentSpecialistHandler;
  private readonly changeServiceCommand: ChangeAppointmentServiceHandler;
  private readonly updateNotesCommand: UpdateAppointmentNotesHandler;

  private readonly listClientQuery: ListClientAppointmentsHandler;
  private readonly listCompanyQuery: ListCompanyAppointmentsHandler;
  private readonly listSpecialistQuery: ListSpecialistAppointmentsHandler;
  private readonly getDetailsQuery: GetAppointmentDetailsHandler;
  private readonly getStatusHistoryQuery: GetAppointmentStatusHistoryHandler;
  private readonly manageAvailabilityQuery: ManageAppointmentAvailabilityHandler;

  constructor(dataSource: DataSource) {
    const appointments = new AppointmentRepository(dataSource);
    const projections = new ProjectionsRepository(dataSource);
    const outbox = new TypeOrmAppointmentEventOutbox();
    this.availability = new AvailabilityService(new AvailabilityRepository(dataSource), projections);

    this.createCommand = new CreateAppointmentHandler(appointments, projections, outbox, this.availability);
    this.approveCommand = new ApproveAppointmentHandler(appointments, projections, outbox);
    this.rejectCommand = new RejectAppointmentHandler(appointments, projections, outbox);
    this.completeCommand = new CompleteAppointmentHandler(appointments, projections, outbox);
    this.cancelCommand = new CancelAppointmentHandler(appointments, projections, outbox);
    this.rescheduleCommand = new RescheduleAppointmentHandler(appointments, projections, outbox, this.availability);
    this.reassignSpecialistCommand = new ReassignAppointmentSpecialistHandler(
      appointments,
      projections,
      outbox,
      this.availability,
    );
    this.changeServiceCommand = new ChangeAppointmentServiceHandler(appointments, projections, outbox, this.availability);
    this.updateNotesCommand = new UpdateAppointmentNotesHandler(appointments, projections);

    this.listClientQuery = new ListClientAppointmentsHandler(appointments, projections);
    this.listCompanyQuery = new ListCompanyAppointmentsHandler(appointments, projections);
    this.listSpecialistQuery = new ListSpecialistAppointmentsHandler(appointments, projections);
    this.getDetailsQuery = new GetAppointmentDetailsHandler(appointments, projections);
    this.getStatusHistoryQuery = new GetAppointmentStatusHistoryHandler(appointments, projections);
    this.manageAvailabilityQuery = new ManageAppointmentAvailabilityHandler(projections);
  }

  async create(
    companyId: string,
    clientUserId: string,
    input: CreateAppointmentInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.createCommand.execute({ companyId, clientUserId, input, correlationId });
  }

  async listForCompany(
    companyId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput = {},
  ): Promise<AppointmentResponse[]> {
    return this.listCompanyQuery.execute(companyId, requesterUserId, input);
  }

  async listPendingForCompany(companyId: string, requesterUserId: string): Promise<AppointmentResponse[]> {
    return this.listCompanyQuery.execute(companyId, requesterUserId, { status: 'pending' });
  }

  async listForClient(clientUserId: string, input: ListAppointmentsQueryInput = {}): Promise<AppointmentResponse[]> {
    return this.listClientQuery.execute(clientUserId, input);
  }

  async listForSpecialist(
    specialistProfileId: string,
    requesterUserId: string,
    input: ListAppointmentsQueryInput,
  ): Promise<AppointmentResponse[]> {
    return this.listSpecialistQuery.execute(specialistProfileId, requesterUserId, input);
  }

  async getById(appointmentId: string, requesterUserId: string): Promise<AppointmentResponse> {
    return this.getDetailsQuery.execute(appointmentId, requesterUserId);
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
    if (input.status === 'approved') {
      return this.approveCommand.execute({ companyId, appointmentId, requesterUserId, correlationId });
    }
    return this.rejectCommand.execute({ companyId, appointmentId, requesterUserId, correlationId });
  }

  async reschedule(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: RescheduleAppointmentInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.rescheduleCommand.execute({ companyId, appointmentId, requesterUserId, input, correlationId });
  }

  async reassignSpecialist(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: ReassignAppointmentSpecialistInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.reassignSpecialistCommand.execute({
      companyId,
      appointmentId,
      requesterUserId,
      specialistProfileId: input.specialistProfileId,
      correlationId,
    });
  }

  async changeService(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: ChangeAppointmentServiceInput,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.changeServiceCommand.execute({
      companyId,
      appointmentId,
      requesterUserId,
      serviceId: input.serviceId,
      correlationId,
    });
  }

  async updateNotes(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    input: UpdateAppointmentNotesInput,
  ): Promise<AppointmentResponse> {
    return this.updateNotesCommand.execute({ companyId, appointmentId, requesterUserId, notes: input.notes });
  }

  async complete(
    companyId: string,
    appointmentId: string,
    requesterUserId: string,
    correlationId?: string,
  ): Promise<AppointmentResponse> {
    return this.completeCommand.execute({ companyId, appointmentId, requesterUserId, correlationId });
  }

  async getStatusHistory(appointmentId: string, requesterUserId: string) {
    return this.getStatusHistoryQuery.execute(appointmentId, requesterUserId);
  }

  async cancel(appointmentId: string, clientUserId: string, correlationId?: string): Promise<AppointmentResponse> {
    return this.cancelCommand.execute({ appointmentId, clientUserId, correlationId });
  }

  async getCompanyAvailability(companyId: string, requesterUserId: string) {
    await this.manageAvailabilityQuery.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.getCompanyAvailability(companyId);
  }

  async setCompanyAvailability(companyId: string, requesterUserId: string, input: SetAvailabilityRulesInput) {
    await this.manageAvailabilityQuery.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.setCompanyAvailability(companyId, input.rules);
  }

  async addCompanyTimeBlock(companyId: string, requesterUserId: string, input: CreateTimeBlockInput) {
    await this.manageAvailabilityQuery.ensureCanManageCompany(companyId, requesterUserId);
    return this.availability.addCompanyTimeBlock({
      companyId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      reason: input.reason ?? null,
      createdByUserId: requesterUserId,
    });
  }

  async removeCompanyTimeBlock(companyId: string, requesterUserId: string, blockId: string): Promise<void> {
    await this.manageAvailabilityQuery.ensureCanManageCompany(companyId, requesterUserId);
    await this.availability.removeCompanyTimeBlock(companyId, blockId);
  }

  async getSpecialistAvailability(companyId: string, specialistProfileId: string, requesterUserId: string) {
    await this.manageAvailabilityQuery.ensureCanManageSpecialistAvailability(companyId, specialistProfileId, requesterUserId);
    return this.availability.getSpecialistAvailability(companyId, specialistProfileId);
  }

  async setSpecialistAvailability(
    companyId: string,
    specialistProfileId: string,
    requesterUserId: string,
    input: SetAvailabilityRulesInput,
  ) {
    await this.manageAvailabilityQuery.ensureCanManageSpecialistAvailability(companyId, specialistProfileId, requesterUserId);
    return this.availability.setSpecialistAvailability(companyId, specialistProfileId, input.rules);
  }

  async addSpecialistTimeBlock(
    companyId: string,
    specialistProfileId: string,
    requesterUserId: string,
    input: CreateTimeBlockInput,
  ) {
    await this.manageAvailabilityQuery.ensureCanManageSpecialistAvailability(companyId, specialistProfileId, requesterUserId);
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
    await this.manageAvailabilityQuery.ensureCanManageSpecialistAvailability(companyId, specialistProfileId, requesterUserId);
    await this.availability.removeSpecialistTimeBlock(companyId, specialistProfileId, blockId);
  }
}
