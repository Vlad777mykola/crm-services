import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Card, Spin } from 'antd';
import { useParams } from 'react-router';

import { fetchCompanyById, updateCompany } from '@/features/companies/api/companiesApi';
import { CompanyForm } from '@/features/companies/ui/CompanyForm';
import type { CompanyFormValues } from '@/features/companies/model/schemas';

export function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['company', companyId];
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: company, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchCompanyById(companyId!),
    enabled: Boolean(companyId),
  });

  const mutation = useMutation({
    mutationFn: (values: CompanyFormValues) =>
      updateCompany(companyId!, {
        name: values.name,
        description: values.description || null,
        category: values.category || null,
        website: values.website || null,
        phone: values.phone || null,
        email: values.email || null,
        city: values.city || null,
        address: values.address || null,
        isRemoteSupported: values.isRemoteSupported,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      setSuccessMessage('Company profile updated');
    },
  });

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (isError || !company) {
    return (
      <Alert
        type="error"
        message="Failed to load company"
        description={error instanceof Error ? error.message : 'Unknown error'}
        style={{ maxWidth: 560, margin: '2rem auto' }}
      />
    );
  }

  return (
    <Card title={`Edit ${company.name}`} style={{ maxWidth: 560, margin: '2rem auto' }}>
      {successMessage && <Alert type="success" message={successMessage} style={{ marginBottom: 16 }} showIcon />}
      {mutation.isError && (
        <Alert
          type="error"
          message={mutation.error instanceof Error ? mutation.error.message : 'Failed to update company'}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}
      <CompanyForm
        submitLabel="Save changes"
        submitting={mutation.isPending}
        defaultValues={{
          name: company.name,
          description: company.description ?? '',
          category: company.category ?? '',
          website: company.website ?? '',
          phone: company.phone ?? '',
          email: company.email ?? '',
          city: company.city ?? '',
          address: company.address ?? '',
          isRemoteSupported: company.isRemoteSupported,
        }}
        onSubmit={(values) => {
          setSuccessMessage(null);
          mutation.mutate(values);
        }}
      />
    </Card>
  );
}
