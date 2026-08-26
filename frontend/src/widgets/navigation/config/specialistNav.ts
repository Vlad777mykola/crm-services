import type { NavItem } from '@/widgets/navigation/model/types';

export const specialistNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/specialist', end: true },
  { key: 'profile', label: 'Profile', path: '/specialist/profile' },
  { key: 'appointments', label: 'Appointments', path: '/specialist/appointments' },
  { key: 'companies', label: 'My companies', path: '/specialist/companies' },
  { key: 'requests', label: 'Company requests', path: '/specialist/company-requests' },
  { key: 'services', label: 'My services', path: '/specialist/services' },
  { key: 'availability', label: 'Availability', path: '/specialist/availability' },
];
