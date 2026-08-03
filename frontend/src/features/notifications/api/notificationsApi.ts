import { authorizedFetch } from '@/shared/api/authorizedFetch';

// NOTE: hand-written until Orval generates a typed client from contracts/openapi.json
// (see contracts/README.md, Step 7/Phase 16). Shape mirrors contracts/openapi/notifications/schemas.yaml.
export type NotificationType =
  | 'appointment.requested'
  | 'appointment.approved'
  | 'appointment.rejected'
  | 'appointment.cancelled';

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

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | T | undefined;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? body.error?.message : undefined;
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }

  return body as T;
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
