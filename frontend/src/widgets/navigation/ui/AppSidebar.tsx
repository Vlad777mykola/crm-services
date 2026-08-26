import { Badge, Menu, Typography } from 'antd';
import { Link, useLocation } from 'react-router';

import { resolveNav } from '@/widgets/navigation/model/resolveNav';
import type { WorkspaceKind } from '@/widgets/navigation/model/types';

import './navigation.css';

interface AppSidebarProps {
  kind: WorkspaceKind;
  companyId?: string;
  unreadNotifications?: number;
  onNavigate?: () => void;
  drawer?: boolean;
}

function isSelected(pathname: string, itemPath: string, exact?: boolean): boolean {
  if (exact) return pathname === itemPath;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function AppSidebar({ kind, companyId, unreadNotifications = 0, onNavigate, drawer = false }: AppSidebarProps) {
  const location = useLocation();
  const nav = resolveNav(kind, companyId);
  const selectedKey = nav.find((item) => isSelected(location.pathname, item.path, item.end))?.key;

  return (
    <aside className={drawer ? 'app-sidebar app-sidebar--drawer' : 'app-sidebar'} aria-label="Workspace navigation">
      <div className="app-sidebar__inner">
        <Menu
          className="app-sidebar__menu"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={nav.map((item) => ({
            key: item.key,
            label: (
              <Link to={item.path} onClick={onNavigate}>
                {item.key === 'notifications' && unreadNotifications > 0 ? (
                  <Badge count={unreadNotifications} size="small" offset={[10, 0]}>
                    <span>{item.label}</span>
                  </Badge>
                ) : (
                  item.label
                )}
              </Link>
            ),
          }))}
        />
        <div className="app-sidebar__footer">
          <Typography.Text type="secondary">CRM Services</Typography.Text>
        </div>
      </div>
    </aside>
  );
}
