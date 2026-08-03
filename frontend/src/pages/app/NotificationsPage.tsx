import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Space, Spin, Tag } from 'antd';
import { Link } from 'react-router';

import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/features/notifications/api/notificationsApi';

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function notificationLink(notification: Notification): string | null {
  const companyId = notification.metadata?.companyId;
  if (typeof companyId !== 'string') {
    return null;
  }

  // Requests/cancellations are surfaced to company managers; approvals/rejections to the client.
  if (notification.type === 'appointment.requested' || notification.type === 'appointment.cancelled') {
    return `/company/${companyId}/appointments`;
  }
  return '/app/appointments';
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const queryKey = ['notifications', 'me'];

  const { data: notifications, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchMyNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const hasUnread = (notifications ?? []).some((notification) => !notification.isRead);

  return (
    <Card
      title="Notifications"
      extra={
        <Space>
          <Button size="small" disabled={!hasUnread} loading={markAllReadMutation.isPending} onClick={() => markAllReadMutation.mutate()}>
            Mark all as read
          </Button>
          <Link to="/app">Back home</Link>
        </Space>
      }
      style={{ maxWidth: 720, margin: '2rem auto' }}
    >
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load notifications"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {notifications && notifications.length === 0 && <Empty description="You have no notifications yet" />}
      {notifications && notifications.length > 0 && (
        <List
          dataSource={notifications}
          renderItem={(notification) => {
            const link = notificationLink(notification);
            const titleContent = link ? <Link to={link}>{notification.title}</Link> : notification.title;
            return (
              <List.Item
                actions={
                  notification.isRead
                    ? []
                    : [
                        <Button
                          key="mark-read"
                          size="small"
                          loading={markReadMutation.isPending}
                          onClick={() => markReadMutation.mutate(notification.id)}
                        >
                          Mark as read
                        </Button>,
                      ]
                }
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {titleContent}
                      {!notification.isRead && <Tag color="blue">New</Tag>}
                    </Space>
                  }
                  description={
                    <>
                      {notification.body}
                      {notification.body && ' · '}
                      {formatDate(notification.createdAt)}
                    </>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
