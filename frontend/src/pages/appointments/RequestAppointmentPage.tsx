import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Form, Input, Result, Select, Spin } from 'antd';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';

import { createAppointment, fetchAvailableSlots } from '@/features/appointments/api/appointmentsApi';
import { appointmentRequestFormSchema, type AppointmentRequestFormValues } from '@/features/appointments/model/schemas';
import { fetchServiceSpecialists } from '@/features/service-specialists/api/serviceSpecialistsApi';
import { fetchServiceById } from '@/features/services/api/servicesApi';

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
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');

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

  const specialistOptions = (specialists ?? [])
    .filter((entry) => entry.specialist)
    .map((entry) => ({ value: entry.specialistProfileId, label: entry.specialist!.displayName }));
  const slotOptions = (slots ?? []).map((slot) => ({
    value: slot.startAt,
    label: `${formatSlot(slot.startAt)} - ${formatSlot(slot.endAt)}`,
  }));

  return (
    <Card
      title={`Request appointment: ${service.name}`}
      extra={<Link to={`/services/${service.id}`}>Back to service</Link>}
      style={{ maxWidth: 560, margin: '2rem auto' }}
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
              label="Available slot"
              validateStatus={errors.requestedStartAt ? 'error' : ''}
              help={errors.requestedStartAt?.message}
            >
              <Select
                {...field}
                disabled={!specialistProfileId || !selectedDate}
                loading={isFetchingSlots}
                options={slotOptions}
                onChange={(value) => field.onChange(value)}
                placeholder="Choose a slot"
                notFoundContent={isFetchingSlots ? <Spin size="small" /> : <Empty description="No slots" />}
              />
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
        <Button type="primary" htmlType="submit" loading={requestMutation.isPending}>
          Send request
        </Button>
        <Button style={{ marginLeft: 8 }} onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </Form>
    </Card>
  );
}
