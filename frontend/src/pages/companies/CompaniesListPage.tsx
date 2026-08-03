import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, List, Spin, Typography } from 'antd';
import { Link } from 'react-router';

import { fetchPublicCompanies } from '@/features/companies/api/companiesApi';

export function CompaniesListPage() {
  const { data: companies, isLoading, isError, error } = useQuery({
    queryKey: ['companies', 'public'],
    queryFn: fetchPublicCompanies,
  });

  return (
    <Card title="Companies" style={{ maxWidth: 720, margin: '2rem auto' }}>
      {isLoading && <Spin style={{ display: 'block', margin: '2rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load companies"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {companies && companies.length === 0 && <Empty description="No published companies yet" />}
      {companies && companies.length > 0 && (
        <List
          dataSource={companies}
          renderItem={(company) => (
            <List.Item>
              <List.Item.Meta
                title={<Link to={`/companies/${company.id}`}>{company.name}</Link>}
                description={
                  <>
                    {company.category && <Typography.Text type="secondary">{company.category}</Typography.Text>}
                    {company.city && <Typography.Text type="secondary"> · {company.city}</Typography.Text>}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
