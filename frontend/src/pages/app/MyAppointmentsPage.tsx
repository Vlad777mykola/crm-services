import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Input, List, Modal, Rate, Select, Space, Spin, Tabs, Tag, Typography } from 'antd';
import { Link } from 'react-router';

import {
  cancelAppointment,
  fetchMyAppointments,
  type Appointment,
  type AppointmentStatus,
} from '@/features/appointments/api/appointmentsApi';
import { AppointmentStatusHistoryModal } from '@/features/appointments/ui/AppointmentStatusHistoryModal';
import { createReview, type CreateReviewInput } from '@/features/reviews/api/reviewsApi';
import { useNow } from '@/shared/lib/useNow';

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  cancelled: 'default',
  completed: 'blue',
};

type RangePreset = 7 | 14 | 21 | 30;

const UPCOMING_LIMIT_BY_RANGE: Record<RangePreset, number> = {
  7: 20,
  14: 30,
  21: 40,
  30: 50,
};

const RANGE_OPTIONS: Array<{ value: RangePreset; label: string }> = [
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 21, label: '3 weeks' },
  { value: 30, label: '1 month' },
];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function dayRange(startDate: string, days: number): { from: string; to: string } {
  const from = new Date(`${startDate}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  return { from: from.toISOString(), to: to.toISOString() };
}

function buildDayList(startDate: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(startDate, index));
}

function clampSelectedDay(startDate: string, days: number, selectedDate: string, today: string): string {
  const endDate = addDays(startDate, days - 1);
  if (selectedDate >= startDate && selectedDate <= endDate) {
    return selectedDate;
  }
  if (today >= startDate && today <= endDate) {
    return today;
  }
  return startDate;
}

const PAST_LIMIT = 20;

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function sortByStartTime(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
}

function groupAppointmentsByDay(appointments: Appointment[], days: string[]): Map<string, Appointment[]> {
  const grouped = new Map(days.map((day) => [day, [] as Appointment[]]));
  for (const appointment of sortByStartTime(appointments)) {
    const dayKey = appointment.startAt.slice(0, 10);
    if (grouped.has(dayKey)) {
      grouped.get(dayKey)!.push(appointment);
    }
  }
  return grouped;
}

export function MyAppointmentsPage() {
  const queryClient = useQueryClient();
  const today = todayInputValue();
  const now = useNow();

  const [reviewingAppointment, setReviewingAppointment] = useState<Appointment | null>(null);
  const [historyAppointmentId, setHistoryAppointmentId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [view, setView] = useState('upcoming');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | undefined>();
  const [companyFilter, setCompanyFilter] = useState<string | undefined>();
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeDays, setRangeDays] = useState<RangePreset>(7);
  const [selectedDate, setSelectedDate] = useState(today);

  const rangeDaysList = useMemo(() => buildDayList(rangeStart, rangeDays), [rangeStart, rangeDays]);
  const upcomingRange = useMemo(() => dayRange(rangeStart, rangeDays), [rangeStart, rangeDays]);
  const upcomingLimit = UPCOMING_LIMIT_BY_RANGE[rangeDays];
  const pastRange = useMemo(() => dayRange(addDays(today, -30), 30), [today]);

  const applyRangeStart = (nextStart: string) => {
    setRangeStart(nextStart);
    setSelectedDate((current) => clampSelectedDay(nextStart, rangeDays, current, today));
  };

  const applyRangeDays = (nextDays: RangePreset) => {
    setRangeDays(nextDays);
    setSelectedDate((current) => clampSelectedDay(rangeStart, nextDays, current, today));
  };

  const shiftRange = (direction: -1 | 1) => {
    applyRangeStart(addDays(rangeStart, direction * rangeDays));
  };

  const queryKey = ['appointments', 'me', view, statusFilter, companyFilter];

  const { data: appointments, isLoading, isError, error } = useQuery({
    queryKey: [...queryKey, view === 'upcoming' ? upcomingRange.from : view === 'past' ? pastRange.from : 'all', rangeDays],
    queryFn: () => {
      if (view === 'upcoming') {
        return fetchMyAppointments({
          from: upcomingRange.from,
          to: upcomingRange.to,
          limit: upcomingLimit,
          status: statusFilter,
        });
      }
      if (view === 'past') {
        return fetchMyAppointments({
          from: pastRange.from,
          to: pastRange.to,
          limit: PAST_LIMIT,
          status: statusFilter,
        });
      }
      return fetchMyAppointments({
        limit: PAST_LIMIT,
        status: 'cancelled',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', 'me'] }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ appointmentId, input }: { appointmentId: string; input: CreateReviewInput }) =>
      createReview(appointmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'me'] });
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

  const visibleAppointments = useMemo(() => {
    const items = (appointments ?? []).filter((appointment) => {
      if (companyFilter && appointment.companyId !== companyFilter) return false;
      return true;
    });
    if (view === 'upcoming') {
      return items.filter(
        (appointment) =>
          appointment.status !== 'cancelled' && new Date(appointment.endAt).getTime() >= now,
      );
    }
    if (view === 'past') {
      return items.filter(
        (appointment) =>
          appointment.status !== 'cancelled' && new Date(appointment.endAt).getTime() < now,
      );
    }
    return items.filter((appointment) => appointment.status === 'cancelled');
  }, [appointments, view, companyFilter, now]);

  const appointmentsByDay = useMemo(
    () => groupAppointmentsByDay(visibleAppointments, rangeDaysList),
    [visibleAppointments, rangeDaysList],
  );

  const daysToShow = useMemo(
    () => rangeDaysList.filter((day) => day >= selectedDate),
    [rangeDaysList, selectedDate],
  );

  const selectDay = (day: string) => {
    setSelectedDate(day);
    document.getElementById(`appointment-day-${day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderAppointmentActions = (appointment: Appointment) => [
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
  ];

  const renderAppointmentItem = (appointment: Appointment) => (
    <List.Item key={appointment.id} actions={renderAppointmentActions(appointment)}>
      <List.Item.Meta
        title={
          <Space>
            {view === 'upcoming' && <Typography.Text strong>{formatTime(appointment.startAt)}</Typography.Text>}
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
            {view !== 'upcoming' && `${new Date(appointment.startAt).toLocaleString()} · `}
            {appointment.specialist && `with ${appointment.specialist.displayName}`}
            {appointment.notes && ` · "${appointment.notes}"`}
          </>
        }
      />
    </List.Item>
  );

  return (
    <Card title="My appointments">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Tabs
          activeKey={view}
          onChange={(nextView) => {
            setView(nextView);
            if (nextView === 'upcoming') {
              setRangeStart(today);
              setSelectedDate(today);
            }
          }}
          items={[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past' },
            { key: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Space wrap>
          {view !== 'cancelled' && (
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
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          )}
          <Select
            allowClear
            value={companyFilter}
            placeholder="Company"
            style={{ minWidth: 200 }}
            onChange={setCompanyFilter}
            options={companyOptions}
          />
          <Link to="/services">
            <Button type="primary">Book appointment</Button>
          </Link>
        </Space>

        {view === 'upcoming' && (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space wrap align="center">
              <Typography.Text type="secondary">From</Typography.Text>
              <Input
                type="date"
                value={rangeStart}
                onChange={(event) => applyRangeStart(event.target.value)}
              />
              <Select
                value={rangeDays}
                style={{ minWidth: 130 }}
                onChange={applyRangeDays}
                options={RANGE_OPTIONS}
              />
              <Button onClick={() => applyRangeStart(today)}>Today</Button>
              <Button onClick={() => shiftRange(-1)}>Previous</Button>
              <Button onClick={() => shiftRange(1)}>Next</Button>
            </Space>
            <Typography.Text type="secondary">
              {formatDayLabel(rangeStart, today)} – {formatDayLabel(addDays(rangeStart, rangeDays - 1), today)} · up to{' '}
              {upcomingLimit} appointments
            </Typography.Text>
            <Space wrap>
              {rangeDaysList.map((day) => {
                const count = appointmentsByDay.get(day)?.length ?? 0;
                return (
                  <Button
                    key={day}
                    size={rangeDays > 14 ? 'small' : 'middle'}
                    type={selectedDate === day ? 'primary' : 'default'}
                    onClick={() => selectDay(day)}
                  >
                    {formatDayLabel(day, today)}
                    {count > 0 ? ` (${count})` : ''}
                  </Button>
                );
              })}
            </Space>
          </Space>
        )}
      </Space>

      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load your appointments"
          description={error instanceof Error ? error.message : 'Unknown error'}
          style={{ marginTop: 16 }}
        />
      )}
      {appointments && appointments.length === 0 && (
        <Empty description="You haven't requested any appointments yet" style={{ marginTop: 24 }}>
          <Link to="/services">
            <Button type="primary">Browse services</Button>
          </Link>
        </Empty>
      )}
      {appointments && appointments.length > 0 && visibleAppointments.length === 0 && (
        <Empty description="No appointments match these filters" style={{ marginTop: 24 }} />
      )}

      {view === 'upcoming' && visibleAppointments.length > 0 && (
        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
          {daysToShow.map((day) => {
            const dayAppointments = appointmentsByDay.get(day) ?? [];
            const isSelected = day === selectedDate;
            return (
              <Card
                key={day}
                id={`appointment-day-${day}`}
                size="small"
                type={isSelected ? 'inner' : undefined}
                title={
                  <Space>
                    <span>{formatDayLabel(day, today)}</span>
                    {isSelected && <Tag color="blue">Selected</Tag>}
                  </Space>
                }
              >
                {dayAppointments.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No appointments" />
                ) : (
                  <List dataSource={dayAppointments} renderItem={renderAppointmentItem} />
                )}
              </Card>
            );
          })}
        </Space>
      )}

      {view !== 'upcoming' && visibleAppointments.length > 0 && (
        <List style={{ marginTop: 16 }} dataSource={visibleAppointments} renderItem={renderAppointmentItem} />
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
