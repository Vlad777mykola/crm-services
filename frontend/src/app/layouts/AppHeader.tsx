import { BellOutlined, DesktopOutlined, MenuOutlined, MoonOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown } from '@/shared/ui';
import type { MenuProps } from '@/shared/ui';
import { Link, useNavigate } from 'react-router';

import { useThemeMode } from '@/app/theme/useThemeMode';
import { useAuth } from '@/features/auth/model/useAuth';
import { WorkspaceSwitcher } from '@/widgets/navigation/ui/WorkspaceSwitcher';
import type { WorkspaceOption } from '@/widgets/navigation/model/types';

interface AppHeaderProps {
  workspaceOptions?: WorkspaceOption[];
  currentWorkspaceKey?: string;
  workspaceLoading?: boolean;
  unreadNotifications?: number;
  onMenuClick?: () => void;
}

export function AppHeader({
  workspaceOptions = [],
  currentWorkspaceKey,
  workspaceLoading,
  unreadNotifications = 0,
  onMenuClick,
}: AppHeaderProps) {
  const { status, logout, user } = useAuth();
  const { mode, resolvedTheme, setMode } = useThemeMode();
  const navigate = useNavigate();
  const isAuthenticated = status === 'authenticated';
  const brandPath = isAuthenticated ? '/app' : '/companies';

  const userMenu: MenuProps = {
    items: [
      { key: 'profile', label: 'Profile' },
      { key: 'logout', label: 'Log out', danger: true },
    ],
    onClick: async ({ key }) => {
      if (key === 'profile') {
        navigate('/app/profile');
        return;
      }
      if (key === 'logout') {
        await logout();
        navigate('/login');
      }
    },
  };
  const themeMenu: MenuProps = {
    selectedKeys: [mode],
    items: [
      { key: 'system', icon: <DesktopOutlined />, label: 'System' },
      { key: 'light', icon: <SunOutlined />, label: 'Light' },
      { key: 'dark', icon: <MoonOutlined />, label: 'Dark' },
    ],
    onClick: ({ key }) => {
      if (key === 'system' || key === 'light' || key === 'dark') {
        setMode(key);
      }
    },
  };
  const ThemeIcon = resolvedTheme === 'dark' ? MoonOutlined : SunOutlined;

  return (
    <header className="layout-header">
      <div className="layout-header__inner">
        <div className="layout-header__left">
          {onMenuClick && (
            <Button
              className="layout-header__menu-button"
              type="text"
              icon={<MenuOutlined />}
              onClick={onMenuClick}
              aria-label="Open navigation"
            />
          )}
          <Link className="layout-header__brand" to={brandPath}>
            <span className="layout-header__brand-mark">CS</span>
            <span>CRM Services</span>
          </Link>
        </div>

        <div className="layout-header__right">
          {isAuthenticated && currentWorkspaceKey && (
            <WorkspaceSwitcher
              currentOptionKey={currentWorkspaceKey}
              options={workspaceOptions}
              loading={workspaceLoading}
            />
          )}
          <Dropdown menu={themeMenu} trigger={['click']}>
            <Button
              type="text"
              icon={<ThemeIcon />}
              aria-label={`Theme menu, currently ${mode}`}
            />
          </Dropdown>
          {isAuthenticated ? (
            <>
              <Badge count={unreadNotifications} size="small">
                <Link to="/app/notifications">
                  <Button type="text" icon={<BellOutlined />} aria-label="Notifications">
                    <span className="layout-header__button-label">Notifications</span>
                  </Button>
                </Link>
              </Badge>
              <Dropdown menu={userMenu} trigger={['click']}>
                <Button icon={<UserOutlined />} aria-label={`Profile menu for ${user?.name ?? 'current user'}`}>
                  <span className="layout-header__button-label">Profile</span>
                </Button>
              </Dropdown>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button type="text">Log in</Button>
              </Link>
              <Link to="/register">
                <Button type="primary">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
