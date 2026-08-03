import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Form, Input } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { companyFormSchema, type CompanyFormValues } from '@/features/companies/model/schemas';

interface CompanyFormProps {
  defaultValues?: Partial<CompanyFormValues>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: CompanyFormValues) => void;
}

const EMPTY_VALUES: CompanyFormValues = {
  name: '',
  description: '',
  category: '',
  website: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  isRemoteSupported: false,
};

export function CompanyForm({ defaultValues, submitLabel, submitting, onSubmit }: CompanyFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });

  const submit = handleSubmit(onSubmit);

  return (
    <Form layout="vertical" onFinish={submit}>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Company name" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} />
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
            <Input {...field} placeholder="e.g. dental, hair salon, consulting" />
          </Form.Item>
        )}
      />
      <Controller
        name="website"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Website" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} placeholder="https://" />
          </Form.Item>
        )}
      />
      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Phone" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} />
          </Form.Item>
        )}
      />
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Email" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
            <Input {...field} />
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
        name="address"
        control={control}
        render={({ field, fieldState }) => (
          <Form.Item label="Address" validateStatus={fieldState.error ? 'error' : ''} help={fieldState.error?.message}>
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
              Remote/online service supported
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
