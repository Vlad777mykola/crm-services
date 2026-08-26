import type { NavItem } from '@/widgets/navigation/model/types';

export function companyNav(companyId: string): NavItem[] {
  return [
    { key: 'dashboard', label: 'Dashboard', path: `/company/${companyId}/dashboard`, end: true },
    { key: 'profile', label: 'Profile', path: `/company/${companyId}/profile` },
    { key: 'members', label: 'Members', path: `/company/${companyId}/members` },
    { key: 'specialists', label: 'Specialists', path: `/company/${companyId}/specialists` },
    { key: 'requests', label: 'Specialist requests', path: `/company/${companyId}/specialist-requests` },
    { key: 'services', label: 'Services', path: `/company/${companyId}/services` },
    { key: 'appointments', label: 'Appointments', path: `/company/${companyId}/appointments` },
    { key: 'availability', label: 'Availability', path: `/company/${companyId}/availability` },
    { key: 'public', label: 'Public page', path: `/companies/${companyId}` },
  ];
}
