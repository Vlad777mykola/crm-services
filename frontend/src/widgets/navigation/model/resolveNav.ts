import { companyNav } from '@/widgets/navigation/config/companyNav';
import { clientNav } from '@/widgets/navigation/config/clientNav';
import { publicNav } from '@/widgets/navigation/config/publicNav';
import { specialistNav } from '@/widgets/navigation/config/specialistNav';
import type { NavItem, WorkspaceKind } from '@/widgets/navigation/model/types';

export function resolveNav(kind: WorkspaceKind, companyId?: string): NavItem[] {
  if (kind === 'company' && companyId) return companyNav(companyId);
  if (kind === 'specialist') return specialistNav;
  if (kind === 'client') return clientNav;
  return publicNav;
}
