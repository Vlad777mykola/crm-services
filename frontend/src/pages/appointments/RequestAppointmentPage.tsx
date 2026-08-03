import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input, Result, Select, Spin } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';

import { createAppointment } from '@/features/appointments/api/appointmentsApi';
import { appointmentRequestFormSchema, type AppointmentRequestFormValues } from '@/features/appointments/model/schemas';
import { fetchServiceSpecialists } from '@/features/service-specialists/api/serviceSpecialistsApi';
import { fetchServiceById } from '@/features/services/api/servicesApi';

const EMPTY_VALUES: AppointmentRequestFormValues = {
  specialistProfileId: '',
  requestedStartAt: '',
  notes: '',
};

export function RequestAppointmentPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();

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
    formState: { errors },
  } = useForm<AppointmentRequestFormValues>({
    resolver: zodResolver(appointmentRequestFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const requestMutation = useMutation({
    mutationFn: (values: AppointmentRequestFormValues) =>
      createAppointment(service!.companyId, {
        serviceId: service!.id,
        specialistProfileId: values.specialistProfileId || null,
        requestedStartAt: new Date(values.requestedStartAt).toISOString(),
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

  const specialistOptions = [
    { value: '', label: 'No preference' },
    ...(specialists ?? [])
      .filter((entry) => entry.specialist)
      .map((entry) => ({ value: entry.specialistProfileId, label: entry.specialist!.displayName })),
  ];

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
          name="requestedStartAt"
          control={control}
          render={({ field }) => (
            <Form.Item
              label="Preferred date and time"
              validateStatus={errors.requestedStartAt ? 'error' : ''}
              help={errors.requestedStartAt?.message}
            >
              <Input {...field} type="datetime-local" />
            </Form.Item>
          )}
        />
        <Controller
          name="specialistProfileId"
          control={control}
          render={({ field }) => (
            <Form.Item label="Preferred specialist (optional)">
              <Select {...field} options={specialistOptions} onChange={(value) => field.onChange(value)} />
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
