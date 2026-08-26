import type { NavItem } from '@/widgets/navigation/model/types';

export const clientNav: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/app', end: true },
  { key: 'appointments', label: 'My appointments', path: '/app/appointments' },
  { key: 'notifications', label: 'Notifications', path: '/app/notifications' },
  { key: 'profile', label: 'Profile', path: '/app/profile' },
  { key: 'companies', label: 'Browse companies', path: '/companies' },
  { key: 'services', label: 'Browse services', path: '/services' },
  { key: 'specialists', label: 'Browse specialists', path: '/specialists' },
];
