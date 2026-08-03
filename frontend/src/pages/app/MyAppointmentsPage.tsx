import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Space, Spin, Tag } from 'antd';
import { Link } from 'react-router';

import { cancelAppointment, fetchMyAppointments, type AppointmentStatus } from '@/features/appointments/api/appointmentsApi';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function MyAppointmentsPage() {
  const queryClient = useQueryClient();
  const queryKey = ['appointments', 'me'];

  const { data: appointments, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: fetchMyAppointments,
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <Card title="My appointment requests" extra={<Link to="/app">Back home</Link>} style={{ maxWidth: 720, margin: '2rem auto' }}>
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load your appointments"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {appointments && appointments.length === 0 && (
        <Empty description="You haven't requested any appointments yet">
          <Link to="/services">
            <Button type="primary">Browse services</Button>
          </Link>
        </Empty>
      )}
      {appointments && appointments.length > 0 && (
        <List
          dataSource={appointments}
          renderItem={(appointment) => (
            <List.Item
              actions={
                ['pending', 'approved'].includes(appointment.status)
                  ? [
                      <Button
                        key="cancel"
                        size="small"
                        danger
                        loading={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(appointment.id)}
                      >
                        Cancel
                      </Button>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    {appointment.service ? (
                      <Link to={`/services/${appointment.service.id}`}>{appointment.service.name}</Link>
                    ) : (
                      'Service'
                    )}
                    <Tag color={STATUS_COLORS[appointment.status]}>{appointment.status}</Tag>
                  </Space>
                }
                description={
                  <>
                    {appointment.company?.name && `${appointment.company.name} · `}
                    {formatDate(appointment.requestedStartAt)}
                    {appointment.specialist && ` · with ${appointment.specialist.displayName}`}
                    {appointment.notes && ` · "${appointment.notes}"`}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
