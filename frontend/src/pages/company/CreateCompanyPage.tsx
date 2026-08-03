import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Card } from 'antd';
import { useNavigate } from 'react-router';

import { createCompany } from '@/features/companies/api/companiesApi';
import { CompanyForm } from '@/features/companies/ui/CompanyForm';
import type { CompanyFormValues } from '@/features/companies/model/schemas';

export function CreateCompanyPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: CompanyFormValues) =>
      createCompany({
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
    onSuccess: (company) => {
      navigate(`/company/${company.id}/dashboard`);
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create company');
    },
  });

  return (
    <Card title="Create a company" style={{ maxWidth: 560, margin: '2rem auto' }}>
      {errorMessage && <Alert type="error" message={errorMessage} style={{ marginBottom: 16 }} showIcon />}
      <CompanyForm submitLabel="Create company" submitting={mutation.isPending} onSubmit={(values) => mutation.mutate(values)} />
    </Card>
  );
}
