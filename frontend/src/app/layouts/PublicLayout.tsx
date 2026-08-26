import { useState } from 'react';

import { Drawer } from 'antd';
import { Outlet } from 'react-router';

import { AppHeader } from '@/app/layouts/AppHeader';
import { useAuth } from '@/features/auth/model/useAuth';
import type { WorkspaceKind } from '@/widgets/navigation/model/types';
import { useWorkspace } from '@/widgets/navigation/model/useWorkspace';
import { AppSidebar } from '@/widgets/navigation/ui/AppSidebar';

export function PublicLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { status } = useAuth();
  const workspace = useWorkspace();
  const navKind: WorkspaceKind = status === 'authenticated' ? 'client' : 'public';
  const unreadNotifications = workspace.summary?.unreadNotifications ?? 0;

  return (
    <>
      <AppHeader
        currentWorkspaceKey={workspace.currentOptionKey}
        workspaceOptions={workspace.workspaceOptions}
        workspaceLoading={workspace.isLoadingSummary}
        unreadNotifications={unreadNotifications}
        onMenuClick={() => setDrawerOpen(true)}
      />
      <div className="public-layout">
        <AppSidebar kind={navKind} unreadNotifications={unreadNotifications} />
        <main className="public-layout__content">
          <Outlet />
        </main>
      </div>
      <Drawer
        title="Navigation"
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={300}
      >
        <AppSidebar
          drawer
          kind={navKind}
          unreadNotifications={unreadNotifications}
          onNavigate={() => setDrawerOpen(false)}
        />
      </Drawer>
    </>
  );
}
