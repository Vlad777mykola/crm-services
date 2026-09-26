import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Input } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { companyFormSchema, type CompanyFormValues } from '@/features/companies/model/schemas';
import { FormField } from '@/shared/ui/form/FormField';

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
    <form className="crm-form" onSubmit={submit}>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Company name" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
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
            <Input {...field} placeholder="e.g. dental, hair salon, consulting" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="website"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Website" error={fieldState.error?.message}>
            <Input {...field} placeholder="https://" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Phone" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Email" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="city"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="City" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="address"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Address" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="isRemoteSupported"
        control={control}
        render={({ field: { value, onChange, ...field } }) => (
          <FormField>
            <Checkbox checked={value} onChange={(event) => onChange(event.target.checked)} {...field}>
              Remote/online service supported
            </Checkbox>
          </FormField>
        )}
      />
      <Button type="primary" htmlType="submit" loading={submitting} disabled={defaultValues !== undefined && !isDirty}>
        {submitLabel}
      </Button>
    </form>
  );
}
