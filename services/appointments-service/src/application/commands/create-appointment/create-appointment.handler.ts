import { AppointmentRepository } from '../../../db/appointment-repository.js';
import { ProjectionsRepository } from '../../../db/projections-repository.js';
import { AppError } from '../../../errors/AppError.js';
import type { CreateAppointmentInput } from '../../../modules/appointments/appointments.schemas.js';
import { AvailabilityService } from '../../../modules/availability/application/availability.service.js';
import { TypeOrmAppointmentEventOutbox } from '../../services/typeorm-appointment-event-outbox.js';
import { toAppointmentResponse, type AppointmentResponse } from '../../view-models/appointment-response.js';
import { addMinutes, isAppointmentOverlapError } from '../shared/appointment-command-utils.js';
import type { CreateAppointmentCommand } from './create-appointment.command.js';

export class CreateAppointmentHandler {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly projections: ProjectionsRepository,
    private readonly outbox: TypeOrmAppointmentEventOutbox,
    private readonly availability: AvailabilityService,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<AppointmentResponse> {
    const { companyId, clientUserId, input, correlationId } = command;

    const service = await this.projections.findService(input.serviceId);
    if (!service || service.companyId !== companyId || service.status !== 'published') {
      throw new AppError('Service not found', 404);
    }

    const assigned = await this.projections.isServiceSpecialistAssigned(service.serviceId, input.specialistProfileId);
    if (!assigned) {
      throw new AppError('Preferred specialist is not assigned to this service', 409);
    }

    const clientName = (await this.projections.findClientProfile(clientUserId))?.name ?? 'Unknown client';
    const startAt =
      input.mode === 'next_available'
        ? await this.resolveNextAvailableStartAt(companyId, service.serviceId, input.specialistProfileId, input)
        : new Date(input.requestedStartAt!);
    const endAt = addMinutes(startAt, service.durationMinutes);

    await this.availability.assertSlotAvailable({
      companyId,
      serviceId: service.serviceId,
      specialistProfileId: input.specialistProfileId,
      startAt,
      endAt,
    });

    const appointment = await this.appointments.withTransaction(async (client) => {
      let created;
      try {
        created = await this.appointments.create(client, {
          companyId,
          serviceId: service.serviceId,
          specialistProfileId: input.specialistProfileId,
          clientUserId,
          requestedStartAt: startAt,
          startAt,
          endAt,
          createdByUserId: clientUserId,
          notes: input.notes ?? null,
        });
      } catch (err) {
        if (isAppointmentOverlapError(err)) {
          throw new AppError('Selected slot is not available', 409);
        }
        throw err;
      }

      await this.appointments.recordStatusChange(client, {
        appointmentId: created.id,
        fromStatus: null,
        toStatus: 'pending',
        changedByUserId: clientUserId,
      });

      await this.outbox.record(client, {
        type: 'appointment.requested',
        aggregateId: created.id,
        correlationId: correlationId ?? null,
        payload: {
          appointmentId: created.id,
          companyId,
          serviceId: service.serviceId,
          serviceName: service.name,
          clientName,
          requestedStartAt: created.requestedStartAt.toISOString(),
          startAt: created.startAt.toISOString(),
          endAt: created.endAt.toISOString(),
        },
      });

      return created;
    });

    return toAppointmentResponse(appointment);
  }

  private async resolveNextAvailableStartAt(
    companyId: string,
    serviceId: string,
    specialistProfileId: string,
    input: CreateAppointmentInput,
  ): Promise<Date> {
    if (!input.windowFrom || !input.windowTo) {
      throw new AppError('windowFrom and windowTo are required for next available booking', 400);
    }

    const slot = await this.availability.findBestAvailableSlot({
      companyId,
      serviceId,
      specialistProfileId,
      from: new Date(input.windowFrom),
      to: new Date(input.windowTo),
      limit: 1,
    });
    if (!slot) {
      throw new AppError('No available slot in selected time', 409);
    }
    return new Date(slot.startAt);
  }
}
