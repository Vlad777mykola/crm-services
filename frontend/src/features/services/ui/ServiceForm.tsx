import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, Input, InputNumber } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { serviceFormSchema, type ServiceFormValues } from '@/features/services/model/schemas';

interface ServiceFormProps {
  defaultValues?: Partial<ServiceFormValues>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: ServiceFormValues) => void;
}

const EMPTY_VALUES: ServiceFormValues = {
  name: '',
  description: '',
  category: '',
  durationMinutes: 30,
  price: '',
};

export function ServiceForm({ defaultValues, submitLabel, submitting, onSubmit }: ServiceFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });

  const submit = handleSubmit(onSubmit);

  return (
    <Form layout="vertical" onFinish={submit}>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Service name" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. Haircut" />
          </Form.Item>
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Description" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input.TextArea {...field} rows={3} />
          </Form.Item>
        )}
      />
      <Controller
        name="category"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Category" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. hair, dental, consulting" />
          </Form.Item>
        )}
      />
      <Controller
        name="durationMinutes"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Duration (minutes)" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <InputNumber
              {...field}
              min={1}
              style={{ width: '100%' }}
              onChange={(value) => field.onChange(value ?? undefined)}
            />
          </Form.Item>
        )}
      />
      <Controller
        name="price"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Price (optional)" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. 49.99, leave blank for 'price on request'" />
          </Form.Item>
        )}
      />
      <Button type="primary" htmlType="submit" loading={submitting} disabled={defaultValues !== undefined && !isDirty}>
        {submitLabel}
      </Button>
    </Form>
  );
}
