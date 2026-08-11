import { Button, Typography } from 'antd';

import './Header.css';

export const APP_HEADER_HEIGHT = 64;
export const APP_HEADER_MOBILE_HEIGHT = 56;

export function Header() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__left">
          <Button type="text">Menu</Button>
          <Typography.Text className="app-header__brand">CRM Services</Typography.Text>
        </div>

        <div className="app-header__right">
          <Button type="text">Profile</Button>
        </div>
      </div>
    </header>
  );
}
