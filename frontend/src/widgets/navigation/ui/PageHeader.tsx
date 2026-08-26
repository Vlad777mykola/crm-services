import type { ReactNode } from 'react';

import { Breadcrumb, Typography } from 'antd';
import { Link } from 'react-router';

import './navigation.css';

interface BreadcrumbItem {
  label: ReactNode;
  path?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({ title, breadcrumbs = [], actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {breadcrumbs.length > 0 && (
          <Breadcrumb
            items={breadcrumbs.map((item) => ({
              title: item.path ? <Link to={item.path}>{item.label}</Link> : item.label,
            }))}
          />
        )}
        <Typography.Title className="page-header__title" level={3}>
          {title}
        </Typography.Title>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
