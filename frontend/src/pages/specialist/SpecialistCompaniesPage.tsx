import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, List, Spin } from 'antd';
import { Link } from 'react-router';

import { fetchMySpecialistCompanies } from '@/features/company-specialists/api/companySpecialistsApi';

export function SpecialistCompaniesPage() {
  const { data: companies, isLoading, isError, error } = useQuery({
    queryKey: ['specialists', 'me', 'companies'],
    queryFn: fetchMySpecialistCompanies,
  });

  return (
    <Card
      title="Companies you work for"
      extra={<Link to="/specialist/company-requests">Company requests</Link>}
      style={{ maxWidth: 640, margin: '2rem auto' }}
    >
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load companies"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {companies && companies.length === 0 && <Empty description="You're not active in any company yet" />}
      {companies && companies.length > 0 && (
        <List
          dataSource={companies}
          renderItem={(entry) => (
            <List.Item>
              <List.Item.Meta
                title={entry.company ? <Link to={`/companies/${entry.company.id}`}>{entry.company.name}</Link> : 'Company'}
                description={`Working here since ${new Date(entry.startedAt).toLocaleDateString()}`}
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
