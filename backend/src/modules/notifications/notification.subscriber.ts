import type { EventBus } from '@/infrastructure/events/event-bus.js';

import { NotificationType } from './notification.entity.js';
import { createNotification, notifyCompanyManagers } from './notifications.service.js';

export function registerNotificationSubscribers(eventBus: EventBus): void {
  eventBus.subscribe('appointment.requested', async ({ payload }) => {
    await notifyCompanyManagers(
      payload.companyId,
      NotificationType.APPOINTMENT_REQUESTED,
      `New appointment request for ${payload.serviceName}`,
      `${payload.clientName} requested ${payload.serviceName} on ${new Date(payload.requestedStartAt).toLocaleString()}`,
      {
        appointmentId: payload.appointmentId,
        companyId: payload.companyId,
        serviceId: payload.serviceId,
      },
    );
  });

  eventBus.subscribe('appointment.approved', async ({ payload }) => {
    await createNotification(
      payload.clientUserId,
      NotificationType.APPOINTMENT_APPROVED,
      `Your appointment for ${payload.serviceName} was approved`,
      `${payload.companyName} · ${new Date(payload.requestedStartAt).toLocaleString()}`,
      {
        appointmentId: payload.appointmentId,
        companyId: payload.companyId,
        serviceId: payload.serviceId,
      },
    );
  });

  eventBus.subscribe('appointment.rejected', async ({ payload }) => {
    await createNotification(
      payload.clientUserId,
      NotificationType.APPOINTMENT_REJECTED,
      `Your appointment for ${payload.serviceName} was rejected`,
      `${payload.companyName} · ${new Date(payload.requestedStartAt).toLocaleString()}`,
      {
        appointmentId: payload.appointmentId,
        companyId: payload.companyId,
        serviceId: payload.serviceId,
      },
    );
  });

  eventBus.subscribe('appointment.completed', async ({ payload }) => {
    await createNotification(
      payload.clientUserId,
      NotificationType.APPOINTMENT_COMPLETED,
      `Your appointment for ${payload.serviceName} is complete`,
      `Let others know how it went - leave a review for ${payload.companyName}.`,
      {
        appointmentId: payload.appointmentId,
        companyId: payload.companyId,
        serviceId: payload.serviceId,
      },
    );
  });

  eventBus.subscribe('appointment.cancelled', async ({ payload }) => {
    await notifyCompanyManagers(
      payload.companyId,
      NotificationType.APPOINTMENT_CANCELLED,
      `Appointment for ${payload.serviceName} was cancelled`,
      `${payload.clientName} cancelled their request for ${new Date(payload.requestedStartAt).toLocaleString()}`,
      {
        appointmentId: payload.appointmentId,
        companyId: payload.companyId,
        serviceId: payload.serviceId,
      },
    );
  });

  eventBus.subscribe('review.received', async ({ payload }) => {
    await notifyCompanyManagers(
      payload.companyId,
      NotificationType.REVIEW_RECEIVED,
      `New ${payload.rating}-star review for ${payload.serviceName}`,
      payload.comment,
      {
        reviewId: payload.reviewId,
        companyId: payload.companyId,
        serviceId: payload.serviceId,
      },
    );
  });
}
