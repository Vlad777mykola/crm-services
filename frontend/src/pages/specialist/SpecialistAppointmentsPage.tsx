import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Input, List, Select, Space, Spin, Tag, Typography } from 'antd';

import {
  fetchSpecialistAppointments,
  type Appointment,
  type AppointmentStatus,
} from '@/features/appointments/api/appointmentsApi';
import { fetchAppDashboardSummary } from '@/features/dashboard/api/dashboardApi';
import { PageHeader } from '@/widgets/navigation/ui/PageHeader';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
  completed: 'blue',
};

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayRange(value: string): { from: string; to: string } {
  const from = new Date(`${value}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appointmentTitle(appointment: Appointment): string {
  return appointment.service?.name ?? 'Service';
}

export function SpecialistAppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [status, setStatus] = useState<AppointmentStatus | undefined>();
  const [companyId, setCompanyId] = useState<string | undefined>();

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['dashboard', 'app'],
    queryFn: fetchAppDashboardSummary,
  });

  const companies = summary?.companies ?? [];
  const selectedCompanyId = companyId ?? companies[0]?.id;
  const range = dayRange(selectedDate);

  const { data: appointments, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['appointments', 'specialist', summary?.specialist?.id, selectedCompanyId, selectedDate, status],
    queryFn: () =>
      fetchSpecialistAppointments(summary!.specialist!.id, {
        companyId: selectedCompanyId,
        from: range.from,
        to: range.to,
        status,
      }),
    enabled: Boolean(summary?.specialist?.id && selectedCompanyId),
    retry: false,
  });

  const groupedAppointments = useMemo(() => {
    return [...(appointments ?? [])].sort(
      (left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
    );
  }, [appointments]);

  return (
    <>
      <PageHeader
        title="Appointments"
        breadcrumbs={[{ label: 'Specialist', path: '/specialist' }, { label: 'Appointments' }]}
      />
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
            <Select
              value={selectedCompanyId}
              placeholder="Company"
              style={{ minWidth: 220 }}
              onChange={setCompanyId}
              options={companies.map((company) => ({ value: company.id, label: company.name }))}
            />
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
          </Space>

          {isLoadingSummary || isLoading ? <Spin /> : null}
          {companies.length === 0 && <Empty description="You are not active in any company yet" />}
          {isError && (
            <Alert
              type="warning"
              message="Appointments could not be loaded for this company"
              description={
                error instanceof Error
                  ? error.message
                  : 'The company may need to grant appointment access before this view can show data.'
              }
              showIcon
            />
          )}
          {!isError && groupedAppointments.length === 0 && companies.length > 0 && (
            <Empty description="No appointments for the selected day" />
          )}
          {!isError && groupedAppointments.length > 0 && (
            <List
              loading={isFetching}
              dataSource={groupedAppointments}
              renderItem={(appointment) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <Typography.Text strong>{formatTime(appointment.startAt)}</Typography.Text>
                        <span>{appointmentTitle(appointment)}</span>
                        <Tag color={STATUS_COLORS[appointment.status]}>{appointment.status}</Tag>
                      </Space>
                    }
                    description={
                      <>
                        {appointment.company?.name ?? companies.find((company) => company.id === appointment.companyId)?.name}
                        {appointment.client?.name && ` - ${appointment.client.name}`}
                        {appointment.notes && ` - ${appointment.notes}`}
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          )}
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
      </Card>
    </>
  );
}
