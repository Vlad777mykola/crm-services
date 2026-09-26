import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Input } from 'antd';
import { Controller, useForm } from 'react-hook-form';

import { specialistProfileFormSchema, type SpecialistProfileFormValues } from '@/features/specialists/model/schemas';
import { FormField } from '@/shared/ui/form/FormField';

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
    <form className="crm-form" onSubmit={submit}>
      <Controller
        name="displayName"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Display name" error={fieldState.error?.message}>
            <Input {...field} status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="headline"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Headline" error={fieldState.error?.message}>
            <Input {...field} placeholder="e.g. Senior hair stylist" status={fieldState.error ? 'error' : undefined} />
          </FormField>
        )}
      />
      <Controller
        name="bio"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="Bio" error={fieldState.error?.message}>
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
        name="city"
        control={control}
        render={({ field, fieldState }) => (
          <FormField label="City" error={fieldState.error?.message}>
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
              Available for remote/online work
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
