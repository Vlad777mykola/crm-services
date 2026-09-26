import { zodResolver } from '@hookform/resolvers/zod';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from 'react-hook-form';

import { FormField } from './FormField';

type AppFormOptions<TFieldValues extends FieldValues> = Omit<UseFormProps<TFieldValues>, 'resolver'> & {
  resolver?: UseFormProps<TFieldValues>['resolver'];
  schema?: Parameters<typeof zodResolver>[0];
};

export function useAppForm<TFieldValues extends FieldValues>({
  schema,
  resolver,
  ...options
}: AppFormOptions<TFieldValues>) {
  return useForm<TFieldValues>({
    ...options,
    resolver: resolver ?? (schema ? (zodResolver(schema) as Resolver<TFieldValues>) : undefined),
  });
}

const AppController = Controller;
const AppFormProvider = FormProvider;

export { AppController, AppFormProvider, FormField, useFormContext as useAppFormContext, useWatch as useAppWatch };
export type {
  Control,
  ControllerProps,
  FieldError,
  FieldErrors,
  FieldPath,
  FieldValues,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';
