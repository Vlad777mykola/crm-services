import { Tabs } from '@/shared/ui';
import { useLocation, useNavigate } from 'react-router';

import { publicNav } from '@/widgets/navigation/config/publicNav';

import './navigation.css';

export function PublicBrowseTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeItem = publicNav.find((item) => location.pathname === item.path);

  return (
    <Tabs
      activeKey={activeItem?.key}
      className="public-browse-tabs"
      items={publicNav.map((item) => ({ key: item.key, label: item.label }))}
      onChange={(key) => {
        const item = publicNav.find((navItem) => navItem.key === key);
        if (item) navigate(item.path);
      }}
    />
  );
}
