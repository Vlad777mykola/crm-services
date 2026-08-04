import { In, type Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { requireCompanyRole } from '@/common/permissions/companyPermissions.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { eventBus } from '@/infrastructure/events/event-bus.js';
import { AuditEntityType, type StatusHistoryEntry } from '@/modules/audit/status-history.entity.js';
import { listStatusHistory, recordStatusChange } from '@/modules/audit/status-history.service.js';
import { APPOINTMENT_STATUS_TRANSITIONS, assertTransitionAllowed } from '@/modules/audit/status-transition.js';
import { CompanyMemberRole } from '@/modules/company-members/company-member.entity.js';
import { Review } from '@/modules/reviews/review.entity.js';
import { ServiceSpecialist } from '@/modules/services/service-specialist.entity.js';
import { Service, ServiceStatus } from '@/modules/services/service.entity.js';

import { Appointment, AppointmentStatus } from './appointment.entity.js';
import type { CreateAppointmentInput, RespondToAppointmentInput } from './appointments.schemas.js';

function getAppointmentRepository(): Repository<Appointment> {
  return AppDataSource.getRepository(Appointment);
}

const APPOINTMENT_RELATIONS = { company: true, service: true, specialist: true, client: true } as const;

async function attachHasReview(appointments: Appointment[]): Promise<Appointment[]> {
  const completedIds = appointments
    .filter((appointment) => appointment.status === AppointmentStatus.COMPLETED)
    .map((appointment) => appointment.id);

  const reviewedIds =
    completedIds.length === 0
      ? new Set<string>()
      : new Set(
          (
            await AppDataSource.getRepository(Review).find({
              where: { appointmentId: In(completedIds) },
            })
          ).map((review) => review.appointmentId),
        );

  for (const appointment of appointments) {
    appointment.hasReview = reviewedIds.has(appointment.id);
  }
  return appointments;
}

async function loadAppointmentOrThrow(where: Record<string, unknown>): Promise<Appointment> {
  const appointment = await getAppointmentRepository().findOne({ where, relations: APPOINTMENT_RELATIONS });
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }
  const [withReview] = await attachHasReview([appointment]);
  return withReview;
}

export async function createAppointment(
  companyId: string,
  clientUserId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const service = await AppDataSource.getRepository(Service).findOne({ where: { id: input.serviceId, companyId } });
  if (!service || service.status !== ServiceStatus.PUBLISHED) {
    throw new AppError('Service not found', 404);
  }

  if (input.specialistProfileId) {
    const assignment = await AppDataSource.getRepository(ServiceSpecialist).findOne({
      where: { serviceId: service.id, specialistProfileId: input.specialistProfileId },
    });
    if (!assignment) {
      throw new AppError('Preferred specialist is not assigned to this service', 409);
    }
  }

  const repository = getAppointmentRepository();
  const appointment = await repository.save(
    repository.create({
      companyId,
      serviceId: service.id,
      specialistProfileId: input.specialistProfileId ?? null,
      clientUserId,
      requestedStartAt: new Date(input.requestedStartAt),
      status: AppointmentStatus.PENDING,
      notes: input.notes ?? null,
    }),
  );

  const loaded = await loadAppointmentOrThrow({ id: appointment.id });

  await recordStatusChange(AuditEntityType.APPOINTMENT, loaded.id, null, AppointmentStatus.PENDING, clientUserId);

  await eventBus.publish('appointment.requested', {
    appointmentId: loaded.id,
    companyId,
    serviceId: loaded.serviceId,
    serviceName: loaded.service.name,
    clientName: loaded.client.name,
    requestedStartAt: loaded.requestedStartAt.toISOString(),
  });

  return loaded;
}

export async function listCompanyAppointments(companyId: string, requesterUserId: string): Promise<Appointment[]> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getAppointmentRepository();
  const appointments = await repository.find({
    where: { companyId },
    relations: APPOINTMENT_RELATIONS,
    order: { createdAt: 'DESC' },
  });
  return attachHasReview(appointments);
}

export async function listMyAppointments(clientUserId: string): Promise<Appointment[]> {
  const repository = getAppointmentRepository();
  const appointments = await repository.find({
    where: { clientUserId },
    relations: APPOINTMENT_RELATIONS,
    order: { createdAt: 'DESC' },
  });
  return attachHasReview(appointments);
}

export async function respondToAppointment(
  companyId: string,
  appointmentId: string,
  requesterUserId: string,
  input: RespondToAppointmentInput,
): Promise<Appointment> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getAppointmentRepository();
  const appointment = await repository.findOne({ where: { id: appointmentId, companyId }, relations: APPOINTMENT_RELATIONS });
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const fromStatus = appointment.status;
  const nextStatus = input.status === 'approved' ? AppointmentStatus.APPROVED : AppointmentStatus.REJECTED;
  assertTransitionAllowed(
    APPOINTMENT_STATUS_TRANSITIONS,
    fromStatus,
    nextStatus,
    'This appointment has already been responded to',
  );

  appointment.status = nextStatus;
  appointment.respondedAt = new Date();
  const saved = await repository.save(appointment);

  await recordStatusChange(AuditEntityType.APPOINTMENT, saved.id, fromStatus, saved.status, requesterUserId);

  const responseEvent =
    saved.status === AppointmentStatus.APPROVED ? 'appointment.approved' : 'appointment.rejected';
  await eventBus.publish(responseEvent, {
    appointmentId: saved.id,
    companyId: saved.companyId,
    serviceId: saved.serviceId,
    clientUserId: saved.clientUserId,
    companyName: saved.company.name,
    serviceName: saved.service.name,
    requestedStartAt: saved.requestedStartAt.toISOString(),
  });

  saved.hasReview = false;
  return saved;
}

export async function completeAppointment(
  companyId: string,
  appointmentId: string,
  requesterUserId: string,
): Promise<Appointment> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getAppointmentRepository();
  const appointment = await repository.findOne({ where: { id: appointmentId, companyId }, relations: APPOINTMENT_RELATIONS });
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const fromStatus = appointment.status;
  assertTransitionAllowed(
    APPOINTMENT_STATUS_TRANSITIONS,
    fromStatus,
    AppointmentStatus.COMPLETED,
    'Only approved appointments can be marked as completed',
  );

  appointment.status = AppointmentStatus.COMPLETED;
  appointment.completedAt = new Date();
  const saved = await repository.save(appointment);

  await recordStatusChange(AuditEntityType.APPOINTMENT, saved.id, fromStatus, saved.status, requesterUserId);

  await eventBus.publish('appointment.completed', {
    appointmentId: saved.id,
    companyId: saved.companyId,
    serviceId: saved.serviceId,
    clientUserId: saved.clientUserId,
    companyName: saved.company.name,
    serviceName: saved.service.name,
  });

  saved.hasReview = false;
  return saved;
}

export async function getAppointmentStatusHistory(
  appointmentId: string,
  requesterUserId: string,
): Promise<StatusHistoryEntry[]> {
  const appointment = await getAppointmentRepository().findOne({ where: { id: appointmentId } });
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.clientUserId !== requesterUserId) {
    await requireCompanyRole(appointment.companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);
  }

  return listStatusHistory(AuditEntityType.APPOINTMENT, appointmentId);
}

export async function cancelAppointment(appointmentId: string, clientUserId: string): Promise<Appointment> {
  const repository = getAppointmentRepository();
  const appointment = await repository.findOne({
    where: { id: appointmentId, clientUserId },
    relations: APPOINTMENT_RELATIONS,
  });
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const fromStatus = appointment.status;
  assertTransitionAllowed(
    APPOINTMENT_STATUS_TRANSITIONS,
    fromStatus,
    AppointmentStatus.CANCELLED,
    'This appointment can no longer be cancelled',
  );

  appointment.status = AppointmentStatus.CANCELLED;
  const saved = await repository.save(appointment);

  await recordStatusChange(AuditEntityType.APPOINTMENT, saved.id, fromStatus, saved.status, clientUserId);

  await eventBus.publish('appointment.cancelled', {
    appointmentId: saved.id,
    companyId: saved.companyId,
    serviceId: saved.serviceId,
    serviceName: saved.service.name,
    clientName: saved.client.name,
    requestedStartAt: saved.requestedStartAt.toISOString(),
  });

  saved.hasReview = false;
  return saved;
}
