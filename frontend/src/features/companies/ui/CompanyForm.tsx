import { Button, Checkbox, Input } from '@/shared/ui';
import { AppController, FormField, useAppForm } from '@/shared/form';

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
  } = useAppForm<CompanyFormValues>({
    schema: companyFormSchema,
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });

  const submit = handleSubmit(onSubmit);

  return (
    <form className="crm-form" onSubmit={submit}>
      <AppController
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Company name" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Description" error={fieldState.error?.message}>
            <Input.TextArea {...field} rows={3} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
        name="category"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Category" error={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. dental, hair salon, consulting" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
        name="website"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Website" error={fieldState.error?.message}>
            <Input {...field} placeholder="https://" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Phone" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Email" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
        name="city"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="City" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
        name="address"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Address" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <AppController
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
