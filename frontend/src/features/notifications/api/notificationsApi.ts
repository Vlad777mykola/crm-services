import { parseJsonOrThrow } from '@/shared/api/apiError';
import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/notifications/schemas.yaml.
export type NotificationType =
  | 'appointment.requested'
  | 'appointment.approved'
  | 'appointment.rejected'
  | 'appointment.cancelled'
  | 'appointment.completed'
  | 'review.received';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export async function fetchMyNotifications(): Promise<Notification[]> {
  const response = await authorizedFetch('/notifications/me');
  const body = await parseJsonOrThrow<{ data: Notification[] }>(response);
  return body.data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await authorizedFetch('/notifications/me/unread-count');
  const body = await parseJsonOrThrow<{ data: { count: number } }>(response);
  return body.data.count;
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const response = await authorizedFetch(`/notifications/me/${notificationId}/read`, { method: 'POST' });
  const body = await parseJsonOrThrow<{ data: Notification }>(response);
  return body.data;
}

export async function markAllNotificationsRead(): Promise<Notification[]> {
  const response = await authorizedFetch('/notifications/me/read-all', { method: 'POST' });
  const body = await parseJsonOrThrow<{ data: Notification[] }>(response);
  return body.data;
}
