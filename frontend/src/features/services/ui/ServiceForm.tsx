import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, InputNumber } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { serviceFormSchema, type ServiceFormValues } from '@/features/services/model/schemas';
import { FormField } from '@/shared/ui/form/FormField';

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
    <form className="crm-form" onSubmit={submit}>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Service name" error={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. Haircut" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Description" error={fieldState.error?.message}>
            <Input.TextArea {...field} rows={3} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="category"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Category" error={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. hair, dental, consulting" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="durationMinutes"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Duration (minutes)" error={fieldState.error?.message}>
            <InputNumber
              {...field}
              min={1}
              status={fieldState.error ? 'error' : undefined}
              style={{ width: '100%' }}
              onChange={(value) => field.onChange(value ?? undefined)}
            />
          </FormField>
        )}
      />
      <Controller
        name="price"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Price (optional)" error={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. 49.99, leave blank for 'price on request'" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Button type="primary" htmlType="submit" loading={submitting} disabled={defaultValues !== undefined && !isDirty}>
        {submitLabel}
      </Button>
    </form>
  );
}
