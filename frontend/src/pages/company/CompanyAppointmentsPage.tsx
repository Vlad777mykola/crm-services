import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Space, Spin, Tag } from 'antd';
import { Link, useParams } from 'react-router';

import {
  fetchCompanyAppointments,
  respondToAppointment,
  type AppointmentStatus,
} from '@/features/appointments/api/appointmentsApi';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function CompanyAppointmentsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['company', companyId, 'appointments'];

  const { data: appointments, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanyAppointments(companyId!),
    enabled: Boolean(companyId),
  });

  const respondMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: 'approved' | 'rejected' }) =>
      respondToAppointment(companyId!, appointmentId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <Card
      title="Appointment requests"
      extra={<Link to={`/company/${companyId}/dashboard`}>Back to dashboard</Link>}
      style={{ maxWidth: 800, margin: '2rem auto' }}
    >
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load appointments"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {appointments && appointments.length === 0 && <Empty description="No appointment requests yet" />}
      {appointments && appointments.length > 0 && (
        <List
          dataSource={appointments}
          renderItem={(appointment) => (
            <List.Item
              actions={
                appointment.status === 'pending'
                  ? [
                      <Button
                        key="approve"
                        size="small"
                        type="primary"
                        loading={respondMutation.isPending}
                        onClick={() => respondMutation.mutate({ appointmentId: appointment.id, status: 'approved' })}
                      >
                        Approve
                      </Button>,
                      <Button
                        key="reject"
                        size="small"
                        danger
                        loading={respondMutation.isPending}
                        onClick={() => respondMutation.mutate({ appointmentId: appointment.id, status: 'rejected' })}
                      >
                        Reject
                      </Button>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    {appointment.service?.name ?? 'Service'}
                    <Tag color={STATUS_COLORS[appointment.status]}>{appointment.status}</Tag>
                  </Space>
                }
                description={
                  <>
                    {appointment.client?.name} ({appointment.client?.email}) · {formatDate(appointment.requestedStartAt)}
                    {appointment.specialist && ` · requested ${appointment.specialist.displayName}`}
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
