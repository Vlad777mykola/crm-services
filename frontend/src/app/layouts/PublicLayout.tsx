import { useState } from 'react';

import { Drawer } from '@/shared/ui';
import { Outlet } from 'react-router';

import { AppHeader } from '@/app/layouts/AppHeader';
import { useAuth } from '@/features/auth/model/useAuth';
import { useWorkspace } from '@/widgets/navigation/model/useWorkspace';
import { AppSidebar } from '@/widgets/navigation/ui/AppSidebar';

export function PublicLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { status } = useAuth();
  const workspace = useWorkspace();
  const isAuthenticated = status === 'authenticated';
  const unreadNotifications = workspace.summary?.unreadNotifications ?? 0;

  return (
    <>
      <AppHeader
        currentWorkspaceKey={workspace.currentOptionKey}
        workspaceOptions={workspace.workspaceOptions}
        workspaceLoading={workspace.isLoadingSummary}
        unreadNotifications={unreadNotifications}
        onMenuClick={isAuthenticated ? () => setDrawerOpen(true) : undefined}
      />
      <div className="public-layout">
        {isAuthenticated && <AppSidebar kind="client" unreadNotifications={unreadNotifications} />}
        <main className="public-layout__content">
          <Outlet />
        </main>
      </div>
      {isAuthenticated && (
        <Drawer
          title="Navigation"
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={300}
        >
          <AppSidebar
            drawer
            kind="client"
            unreadNotifications={unreadNotifications}
            onNavigate={() => setDrawerOpen(false)}
          />
        </Drawer>
      )}
    </>
  );
}
