import type { ReactNode } from 'react';

export type WorkspaceKind = 'client' | 'specialist' | 'company' | 'public';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  badge?: ReactNode;
  end?: boolean;
}

export interface WorkspaceOption {
  key: string;
  label: string;
  path: string;
  kind: WorkspaceKind;
}
