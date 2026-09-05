import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Empty, Form, Input, Result, Select, Space, Spin, Tag, Typography } from 'antd';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useParams, useSearchParams } from 'react-router';

import { createAppointment, fetchAvailableSlots } from '@/features/appointments/api/appointmentsApi';
import { appointmentRequestFormSchema, type AppointmentRequestFormValues } from '@/features/appointments/model/schemas';
import { fetchServiceSpecialists } from '@/features/service-specialists/api/serviceSpecialistsApi';
import { fetchServiceById } from '@/features/services/api/servicesApi';

import './RequestAppointmentPage.css';

const EMPTY_VALUES: AppointmentRequestFormValues = {
  specialistProfileId: '',
  requestedStartAt: '',
  notes: '',
};

function dayRange(value: string): { from: string; to: string } | null {
  if (!value) return null;
  const from = new Date(`${value}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatSlot(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RequestAppointmentPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState('');
  const preferredSpecialistId = searchParams.get('specialistId');

  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => fetchServiceById(serviceId!),
    enabled: Boolean(serviceId),
  });

  const { data: specialists } = useQuery({
    queryKey: ['service', serviceId, 'specialists'],
    queryFn: () => fetchServiceSpecialists(serviceId!),
    enabled: Boolean(serviceId),
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AppointmentRequestFormValues>({
    resolver: zodResolver(appointmentRequestFormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const specialistProfileId = useWatch({ control, name: 'specialistProfileId' });
  const requestedStartAt = useWatch({ control, name: 'requestedStartAt' });
  const range = dayRange(selectedDate);

  const { data: slots, isFetching: isFetchingSlots } = useQuery({
    queryKey: ['appointments', 'available-slots', service?.companyId, service?.id, specialistProfileId, selectedDate],
    queryFn: () =>
      fetchAvailableSlots({
        companyId: service!.companyId,
        serviceId: service!.id,
        specialistProfileId,
        from: range!.from,
        to: range!.to,
        slotStepMinutes: 15,
      }),
    enabled: Boolean(service?.companyId && service?.id && specialistProfileId && range),
  });

  const requestMutation = useMutation({
    mutationFn: (values: AppointmentRequestFormValues) =>
      createAppointment(service!.companyId, {
        serviceId: service!.id,
        specialistProfileId: values.specialistProfileId,
        requestedStartAt: values.requestedStartAt,
        notes: values.notes || null,
      }),
  });

  const specialistOptions = useMemo(
    () =>
      (specialists ?? []).map((entry) => ({
        value: entry.specialistProfileId,
        label: entry.specialist?.displayName ?? 'Specialist',
      })),
    [specialists],
  );

  useEffect(() => {
    if (!preferredSpecialistId || specialistProfileId) return;
    if (specialistOptions.some((option) => option.value === preferredSpecialistId)) {
      setValue('specialistProfileId', preferredSpecialistId);
    }
  }, [preferredSpecialistId, setValue, specialistOptions, specialistProfileId]);

  if (isLoadingService) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (!service) {
    return (
      <Alert
        type="error"
        message="Service not found"
        description="This service may not be published anymore."
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  if (requestMutation.isSuccess) {
    return (
      <Result
        status="success"
        title="Appointment requested"
        subTitle="The company will review your request and approve or reject it soon."
        extra={[
          <Link key="mine" to="/app/appointments">
            <Button type="primary">View my appointments</Button>
          </Link>,
          <Link key="back" to={`/services/${service.id}`}>
            <Button>Back to service</Button>
          </Link>,
        ]}
      />
    );
  }

  const selectedSpecialist = specialistOptions.find((option) => option.value === specialistProfileId);
  const selectedSlot = (slots ?? []).find((slot) => slot.startAt === requestedStartAt);

  return (
    <Card
      title="Request appointment"
      extra={<Link to={`/services/${service.id}`}>Back to service</Link>}
    >
      {requestMutation.isError && (
        <Alert
          type="error"
          message={requestMutation.error instanceof Error ? requestMutation.error.message : 'Failed to request appointment'}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <Form layout="vertical" onFinish={handleSubmit((values) => requestMutation.mutate(values))}>
        <section className="booking-section">
          <Typography.Title level={5}>Service</Typography.Title>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Name">{service.name}</Descriptions.Item>
            <Descriptions.Item label="Company">{service.company?.name ?? 'Company'}</Descriptions.Item>
            <Descriptions.Item label="Duration">{service.durationMinutes} min</Descriptions.Item>
            <Descriptions.Item label="Price">{service.price ? `$${service.price}` : 'Price on request'}</Descriptions.Item>
          </Descriptions>
        </section>

        <Controller
          name="specialistProfileId"
          control={control}
          render={({ field }) => (
            <Form.Item
              label="Specialist"
              validateStatus={errors.specialistProfileId ? 'error' : ''}
              help={errors.specialistProfileId?.message}
            >
              <Select
                {...field}
                options={specialistOptions}
                onChange={(value) => {
                  field.onChange(value);
                  setValue('requestedStartAt', '');
                }}
                placeholder="Choose specialist"
              />
            </Form.Item>
          )}
        />

        <Form.Item label="Date">
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setValue('requestedStartAt', '');
            }}
          />
        </Form.Item>

        <Controller
          name="requestedStartAt"
          control={control}
          render={({ field }) => (
            <Form.Item
              label="Available time"
              validateStatus={errors.requestedStartAt ? 'error' : ''}
              help={errors.requestedStartAt?.message}
            >
              {!specialistProfileId || !selectedDate ? (
                <Empty description="Choose a specialist and date first" />
              ) : isFetchingSlots ? (
                <Spin size="small" />
              ) : !slots || slots.length === 0 ? (
                <Empty description="No slots" />
              ) : (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Typography.Text type="secondary">
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Typography.Text>
                  <Space wrap>
                    {slots.map((slot) => (
                      <Button
                        key={slot.startAt}
                        type={field.value === slot.startAt ? 'primary' : 'default'}
                        onClick={() => field.onChange(slot.startAt)}
                      >
                        {formatSlot(slot.startAt)}
                      </Button>
                    ))}
                  </Space>
                </Space>
              )}
            </Form.Item>
          )}
        />
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Form.Item label="Notes for the company (optional)">
              <Input.TextArea {...field} rows={3} placeholder="Anything the company should know" />
            </Form.Item>
          )}
        />
        <section className="booking-section">
          <Typography.Title level={5}>Summary</Typography.Title>
          <Space direction="vertical" size="small">
            <span>{service.company?.name ?? 'Company'}</span>
            <span>{service.name}</span>
            <span>{selectedSpecialist?.label ?? 'Choose specialist'}</span>
            <span>
              {selectedSlot
                ? `${new Date(selectedSlot.startAt).toLocaleString()} - ${formatSlot(selectedSlot.endAt)}`
                : 'Choose date and time'}
            </span>
            <Tag>{service.durationMinutes} min</Tag>
          </Space>
        </section>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={requestMutation.isPending}>
            Confirm appointment
          </Button>
          <Link to={`/services/${service.id}`}>
            <Button>Cancel</Button>
          </Link>
        </Space>
      </Form>
    </Card>
  );
}
