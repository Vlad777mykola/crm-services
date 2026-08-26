import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Input, List, Modal, Rate, Select, Space, Spin, Tabs, Tag } from 'antd';
import { Link } from 'react-router';

import {
  cancelAppointment,
  fetchMyAppointments,
  type Appointment,
  type AppointmentStatus,
} from '@/features/appointments/api/appointmentsApi';
import { AppointmentStatusHistoryModal } from '@/features/appointments/ui/AppointmentStatusHistoryModal';
import { createReview, type CreateReviewInput } from '@/features/reviews/api/reviewsApi';

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

function isFutureAppointment(appointment: Appointment): boolean {
  return new Date(appointment.startAt).getTime() >= Date.now();
}

export function MyAppointmentsPage() {
  const queryClient = useQueryClient();
  const queryKey = ['appointments', 'me'];
  const [reviewingAppointment, setReviewingAppointment] = useState<Appointment | null>(null);
  const [historyAppointmentId, setHistoryAppointmentId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [view, setView] = useState('upcoming');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | undefined>();
  const [companyFilter, setCompanyFilter] = useState<string | undefined>();
  const [dateFilter, setDateFilter] = useState('');

  const { data: appointments, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchMyAppointments(),
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ appointmentId, input }: { appointmentId: string; input: CreateReviewInput }) =>
      createReview(appointmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setReviewingAppointment(null);
      setRating(5);
      setComment('');
    },
  });

  const openReviewModal = (appointment: Appointment) => {
    reviewMutation.reset();
    setRating(5);
    setComment('');
    setReviewingAppointment(appointment);
  };

  const companyOptions = Array.from(
    new Map((appointments ?? []).filter((appointment) => appointment.company).map((appointment) => [
      appointment.company!.id,
      appointment.company!.name,
    ])).entries(),
  ).map(([value, label]) => ({ value, label }));

  const visibleAppointments = (appointments ?? []).filter((appointment) => {
    if (view === 'upcoming' && (!isFutureAppointment(appointment) || appointment.status === 'cancelled')) return false;
    if (view === 'past' && (isFutureAppointment(appointment) || appointment.status === 'cancelled')) return false;
    if (view === 'cancelled' && appointment.status !== 'cancelled') return false;
    if (statusFilter && appointment.status !== statusFilter) return false;
    if (companyFilter && appointment.companyId !== companyFilter) return false;
    if (dateFilter && appointment.startAt.slice(0, 10) !== dateFilter) return false;
    return true;
  });

  return (
    <Card title="My appointments">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Tabs
          activeKey={view}
          onChange={setView}
          items={[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past' },
            { key: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Space wrap>
          <Select
            allowClear
            value={statusFilter}
            placeholder="Status"
            style={{ minWidth: 160 }}
            onChange={setStatusFilter}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <Select
            allowClear
            value={companyFilter}
            placeholder="Company"
            style={{ minWidth: 200 }}
            onChange={setCompanyFilter}
            options={companyOptions}
          />
          <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          <Link to="/services">
            <Button type="primary">Book appointment</Button>
          </Link>
        </Space>
      </Space>
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
      {appointments && appointments.length > 0 && visibleAppointments.length === 0 && (
        <Empty description="No appointments match these filters" style={{ marginTop: 24 }} />
      )}
      {visibleAppointments.length > 0 && (
        <List
          style={{ marginTop: 16 }}
          dataSource={visibleAppointments}
          renderItem={(appointment) => (
            <List.Item
              actions={[
                <Button key="history" size="small" onClick={() => setHistoryAppointmentId(appointment.id)}>
                  History
                </Button>,
                ...(['pending', 'approved'].includes(appointment.status)
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
                  : []),
                ...(appointment.status === 'completed' && !appointment.hasReview
                  ? [
                      <Button key="review" size="small" type="primary" onClick={() => openReviewModal(appointment)}>
                        Leave a review
                      </Button>,
                    ]
                  : []),
              ]}
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

      <Modal
        title={reviewingAppointment?.service ? `Review ${reviewingAppointment.service.name}` : 'Leave a review'}
        open={Boolean(reviewingAppointment)}
        onCancel={() => setReviewingAppointment(null)}
        onOk={() =>
          reviewingAppointment &&
          reviewMutation.mutate({ appointmentId: reviewingAppointment.id, input: { rating, comment: comment || null } })
        }
        confirmLoading={reviewMutation.isPending}
        okText="Submit review"
        destroyOnClose
      >
        {reviewMutation.isError && (
          <Alert
            type="error"
            message={reviewMutation.error instanceof Error ? reviewMutation.error.message : 'Failed to submit review'}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        <Space direction="vertical" style={{ display: 'flex' }} size="middle">
          <Rate value={rating} onChange={setRating} />
          <Input.TextArea
            rows={3}
            placeholder="Share details about your experience (optional)"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </Space>
      </Modal>

      <AppointmentStatusHistoryModal appointmentId={historyAppointmentId} onClose={() => setHistoryAppointmentId(null)} />
    </Card>
  );
}
