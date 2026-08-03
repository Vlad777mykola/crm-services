import { createBrowserRouter } from 'react-router';

import { LoginPage } from '@/features/auth/ui/LoginPage';
import { ProtectedRoute } from '@/features/auth/ui/ProtectedRoute';
import { RegisterPage } from '@/features/auth/ui/RegisterPage';
import { AppHomePage } from '@/pages/app/AppHomePage';
import { ProfilePage } from '@/pages/app/ProfilePage';
import { CompaniesListPage } from '@/pages/companies/CompaniesListPage';
import { CompanyPublicPage } from '@/pages/companies/CompanyPublicPage';
import { CompanyDashboardPage } from '@/pages/company/CompanyDashboardPage';
import { CompanyProfilePage } from '@/pages/company/CompanyProfilePage';
import { CreateCompanyPage } from '@/pages/company/CreateCompanyPage';
import { HealthPage } from '@/pages/health/HealthPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HealthPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppHomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/app/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/companies',
    element: <CompaniesListPage />,
  },
  {
    path: '/companies/:companyId',
    element: <CompanyPublicPage />,
  },
  {
    path: '/company/create',
    element: (
      <ProtectedRoute>
        <CreateCompanyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/company/:companyId/dashboard',
    element: (
      <ProtectedRoute>
        <CompanyDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/company/:companyId/profile',
    element: (
      <ProtectedRoute>
        <CompanyProfilePage />
      </ProtectedRoute>
    ),
  },
]);
