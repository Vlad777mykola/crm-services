import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Form, Input } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { specialistProfileFormSchema, type SpecialistProfileFormValues } from '@/features/specialists/model/schemas';

interface SpecialistProfileFormProps {
  defaultValues?: Partial<SpecialistProfileFormValues>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: SpecialistProfileFormValues) => void;
}

const EMPTY_VALUES: SpecialistProfileFormValues = {
  displayName: '',
  headline: '',
  bio: '',
  category: '',
  city: '',
  isRemoteSupported: false,
};

export function SpecialistProfileForm({ defaultValues, submitLabel, submitting, onSubmit }: SpecialistProfileFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<SpecialistProfileFormValues>({
    resolver: zodResolver(specialistProfileFormSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });

  const submit = handleSubmit(onSubmit);

  return (
    <Form layout="vertical" onFinish={submit}>
      <Controller
        name="displayName"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Display name" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} />
          </Form.Item>
        )}
      />
      <Controller
        name="headline"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Headline" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. Senior hair stylist" />
          </Form.Item>
        )}
      />
      <Controller
        name="bio"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Bio" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input.TextArea {...field} rows={3} />
          </Form.Item>
        )}
      />
      <Controller
        name="category"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Category" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. dental, hair salon, consulting" />
          </Form.Item>
        )}
      />
      <Controller
        name="city"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="City" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} />
          </Form.Item>
        )}
      />
      <Controller
        name="isRemoteSupported"
        control={control}
        render={({ field: { value, onChange, ...field } }) => (
          <Form.Item>
            <Checkbox checked={value} onChange={(event) => onChange(event.target.checked)} {...field}>
              Available for remote/online work
            </Checkbox>
          </Form.Item>
        )}
      />
      <Button type="primary" htmlType="submit" loading={submitting} disabled={defaultValues !== undefined && !isDirty}>
        {submitLabel}
      </Button>
    </Form>
  );
}
