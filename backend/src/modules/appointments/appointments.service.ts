import type { Repository } from 'typeorm';

import { AppError } from '@/common/errors/AppError.js';
import { requireCompanyRole } from '@/common/permissions/companyPermissions.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { CompanyMemberRole } from '@/modules/company-members/company-member.entity.js';
import { ServiceSpecialist } from '@/modules/services/service-specialist.entity.js';
import { Service, ServiceStatus } from '@/modules/services/service.entity.js';

import { Appointment, AppointmentStatus } from './appointment.entity.js';
import type { CreateAppointmentInput, RespondToAppointmentInput } from './appointments.schemas.js';

function getAppointmentRepository(): Repository<Appointment> {
  return AppDataSource.getRepository(Appointment);
}

const APPOINTMENT_RELATIONS = { company: true, service: true, specialist: true, client: true } as const;

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

  return (await repository.findOne({ where: { id: appointment.id }, relations: APPOINTMENT_RELATIONS }))!;
}

export async function listCompanyAppointments(companyId: string, requesterUserId: string): Promise<Appointment[]> {
  await requireCompanyRole(companyId, requesterUserId, [CompanyMemberRole.OWNER, CompanyMemberRole.MANAGER]);

  const repository = getAppointmentRepository();
  return repository.find({
    where: { companyId },
    relations: APPOINTMENT_RELATIONS,
    order: { createdAt: 'DESC' },
  });
}

export async function listMyAppointments(clientUserId: string): Promise<Appointment[]> {
  const repository = getAppointmentRepository();
  return repository.find({
    where: { clientUserId },
    relations: APPOINTMENT_RELATIONS,
    order: { createdAt: 'DESC' },
  });
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

  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new AppError('This appointment has already been responded to', 409);
  }

  appointment.status = input.status === 'approved' ? AppointmentStatus.APPROVED : AppointmentStatus.REJECTED;
  appointment.respondedAt = new Date();
  return repository.save(appointment);
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

  if (![AppointmentStatus.PENDING, AppointmentStatus.APPROVED].includes(appointment.status)) {
    throw new AppError('This appointment can no longer be cancelled', 409);
  }

  appointment.status = AppointmentStatus.CANCELLED;
  return repository.save(appointment);
}
