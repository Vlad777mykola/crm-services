import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Select, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchMySpecialistCompanies } from '@/features/company-specialists/api/companySpecialistsApi';
import { PageHeader } from '@/widgets/navigation/ui/PageHeader';

export function SpecialistAvailabilityPage() {
  const [companyId, setCompanyId] = useState<string>();

  const { data: companies, isLoading, isError, error } = useQuery({
    queryKey: ['specialists', 'me', 'companies'],
    queryFn: fetchMySpecialistCompanies,
  });

  const activeCompanies = (companies ?? []).filter((entry) => entry.status === 'active' && entry.company);
  const selectedCompany = activeCompanies.find((entry) => entry.companyId === companyId) ?? activeCompanies[0];

  return (
    <>
      <PageHeader
        title="Availability"
        breadcrumbs={[{ label: 'Specialist', path: '/specialist' }, { label: 'Availability' }]}
      />
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="Availability follows the company boundary"
          description="Company open hours define the outer window. Specialist hours and blocked time are managed inside each company workspace so bookings never appear outside company working hours."
        />

        <Card title="Company context" loading={isLoading}>
          {isError && (
            <Alert
              type="error"
              message="Failed to load companies"
              description={error instanceof Error ? error.message : 'Unknown error'}
              showIcon
            />
          )}
          {!isError && activeCompanies.length === 0 && <Empty description="You are not active in any company yet" />}
          {!isError && activeCompanies.length > 0 && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Select
                value={selectedCompany?.companyId}
                onChange={setCompanyId}
                options={activeCompanies.map((entry) => ({
                  value: entry.companyId,
                  label: entry.company?.name ?? 'Company',
                }))}
                style={{ width: '100%' }}
              />
              <List
                dataSource={[
                  'Company working hours',
                  'Specialist weekly schedule',
                  'Days off and custom hours',
                  'Service duration and generated slots',
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <Space>
                      <Tag color="blue">Boundary</Tag>
                      <Typography.Text>{item}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              <Space wrap>
                <Link to={`/companies/${selectedCompany?.companyId}`}>
                  <Button>View public company</Button>
                </Link>
                <Link to={`/company/${selectedCompany?.companyId}/availability`}>
                  <Button type="primary">Open company availability</Button>
                </Link>
              </Space>
            </Space>
          )}
        </Card>
      </Space>
    </>
  );
}
