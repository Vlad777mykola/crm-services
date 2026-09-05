import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Input, List, Select, Space, Spin, Tag, Typography } from 'antd';
import { useParams } from 'react-router';

import {
  completeAppointment,
  fetchCompanyAppointments,
  type Appointment,
  respondToAppointment,
  type AppointmentStatus,
} from '@/features/appointments/api/appointmentsApi';
import { AppointmentNotesModal } from '@/features/appointments/ui/AppointmentNotesModal';
import { AppointmentStatusHistoryModal } from '@/features/appointments/ui/AppointmentStatusHistoryModal';
import { useCompanyPermissions } from '@/features/dashboard/model/useCompanyPermissions';
import { PageHeader } from '@/widgets/navigation/ui/PageHeader';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
  completed: 'blue',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayRange(value: string): { from: string; to: string } {
  const from = new Date(`${value}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function sortByStartTime(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
}

export function CompanyAppointmentsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [status, setStatus] = useState<AppointmentStatus | undefined>();
  const range = dayRange(selectedDate);
  const queryKey = ['company', companyId, 'appointments', selectedDate, status];
  const [historyAppointmentId, setHistoryAppointmentId] = useState<string | null>(null);
  const [notesAppointment, setNotesAppointment] = useState<Appointment | null>(null);
  const { can } = useCompanyPermissions(companyId);

  const { data: appointments, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanyAppointments(companyId!, { from: range.from, to: range.to, status }),
    enabled: Boolean(companyId),
  });

  const respondMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: 'approved' | 'rejected' }) =>
      respondToAppointment(companyId!, appointmentId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const completeMutation = useMutation({
    mutationFn: (appointmentId: string) => completeAppointment(companyId!, appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const visibleAppointments = sortByStartTime(appointments ?? []);

  return (
    <>
      <PageHeader
        title="Appointments"
        breadcrumbs={[{ label: 'Company', path: `/company/${companyId}/dashboard` }, { label: 'Appointments' }]}
      />
      <Card>
      <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
        <Space wrap>
          <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <Select
            allowClear
            value={status}
            placeholder="Status"
            style={{ minWidth: 180 }}
            onChange={setStatus}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Confirmed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'completed', label: 'Completed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <Button
            onClick={() => {
              const next = new Date(`${selectedDate}T00:00:00`);
              next.setDate(next.getDate() + 1);
              setSelectedDate(next.toISOString().slice(0, 10));
            }}
          >
            Load next day
          </Button>
        </Space>
        <Typography.Text type="secondary">Day list grouped by appointment start time.</Typography.Text>
      </Space>
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load appointments"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {appointments && visibleAppointments.length === 0 && <Empty description="No appointments for this day" />}
      {visibleAppointments.length > 0 && (
        <List
          dataSource={visibleAppointments}
          renderItem={(appointment) => (
            <List.Item
              actions={[
                <Button key="history" size="small" onClick={() => setHistoryAppointmentId(appointment.id)}>
                  History
                </Button>,
                ...(can('company.appointments.manage')
                  ? [
                      <Button key="notes" size="small" onClick={() => setNotesAppointment(appointment)}>
                        Notes
                      </Button>,
                    ]
                  : []),
                ...(appointment.status === 'pending' && can('appointments.approve')
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
                  : []),
                ...(appointment.status === 'approved' && can('company.appointments.manage')
                  ? [
                      <Button
                        key="complete"
                        size="small"
                        type="primary"
                        loading={completeMutation.isPending}
                        onClick={() => completeMutation.mutate(appointment.id)}
                      >
                        Mark completed
                      </Button>,
                    ]
                  : []),
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Typography.Text strong>{formatTime(appointment.startAt)}</Typography.Text>
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

      <AppointmentStatusHistoryModal appointmentId={historyAppointmentId} onClose={() => setHistoryAppointmentId(null)} />
      {companyId && (
        <AppointmentNotesModal
          companyId={companyId}
          appointmentId={notesAppointment?.id ?? null}
          initialNotes={notesAppointment?.notes ?? null}
          onClose={() => setNotesAppointment(null)}
          invalidateQueryKey={queryKey}
        />
      )}
      </Card>
    </>
  );
}
