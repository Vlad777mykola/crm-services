import { useState } from 'react';

import { Drawer, Result, Spin } from 'antd';
import { Link, Outlet, useLocation } from 'react-router';

import { AppHeader } from '@/app/layouts/AppHeader';
import { AppSidebar } from '@/widgets/navigation/ui/AppSidebar';
import { useWorkspace } from '@/widgets/navigation/model/useWorkspace';

export function WorkspaceLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const workspace = useWorkspace();
  const unreadNotifications = workspace.summary?.unreadNotifications ?? 0;

  const companyAccessDenied =
    workspace.kind === 'company' &&
    workspace.companyId &&
    workspace.summary &&
    !workspace.summary.companies.some((company) => company.id === workspace.companyId);

  const specialistProfileMissing =
    workspace.kind === 'specialist' &&
    workspace.summary &&
    !workspace.summary.specialist &&
    location.pathname !== '/specialist/profile';

  if (workspace.isLoadingSummary) {
    return (
      <>
        <AppHeader
          currentWorkspaceKey={workspace.currentOptionKey}
          workspaceOptions={workspace.workspaceOptions}
          workspaceLoading
          onMenuClick={() => setDrawerOpen(true)}
        />
        <div className="workspace-guard">
          <Spin />
        </div>
      </>
    );
  }

  if (companyAccessDenied) {
    return (
      <>
        <AppHeader
          currentWorkspaceKey={workspace.currentOptionKey}
          workspaceOptions={workspace.workspaceOptions}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <div className="workspace-guard">
          <Result
            status="403"
            title="You do not have access to this company."
            extra={<Link to="/app">Go to my dashboard</Link>}
          />
        </div>
      </>
    );
  }

  if (specialistProfileMissing) {
    return (
      <>
        <AppHeader
          currentWorkspaceKey={workspace.currentOptionKey}
          workspaceOptions={workspace.workspaceOptions}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <div className="workspace-guard">
          <Result
            status="info"
            title="Create a specialist profile to use this workspace."
            extra={<Link to="/specialist/profile">Create specialist profile</Link>}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        currentWorkspaceKey={workspace.currentOptionKey}
        workspaceOptions={workspace.workspaceOptions}
        workspaceLoading={workspace.isLoadingSummary}
        unreadNotifications={unreadNotifications}
        onMenuClick={() => setDrawerOpen(true)}
      />
      <div className="workspace-layout">
        <AppSidebar
          kind={workspace.kind}
          companyId={workspace.companyId}
          unreadNotifications={unreadNotifications}
        />
        <main className="workspace-layout__content">
          <div className="workspace-layout__inner">
            <Outlet />
          </div>
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
          kind={workspace.kind}
          companyId={workspace.companyId}
          unreadNotifications={unreadNotifications}
          onNavigate={() => setDrawerOpen(false)}
        />
      </Drawer>
    </>
  );
}
