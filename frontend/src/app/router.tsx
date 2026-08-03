import { createBrowserRouter } from 'react-router';

import { LoginPage } from '@/features/auth/ui/LoginPage';
import { ProtectedRoute } from '@/features/auth/ui/ProtectedRoute';
import { RegisterPage } from '@/features/auth/ui/RegisterPage';
import { AppHomePage } from '@/pages/app/AppHomePage';
import { ProfilePage } from '@/pages/app/ProfilePage';
import { CompaniesListPage } from '@/pages/companies/CompaniesListPage';
import { CompanyPublicPage } from '@/pages/companies/CompanyPublicPage';
import { CompanyDashboardPage } from '@/pages/company/CompanyDashboardPage';
import { CompanyMembersPage } from '@/pages/company/CompanyMembersPage';
import { CompanyProfilePage } from '@/pages/company/CompanyProfilePage';
import { CompanySpecialistRequestsPage } from '@/pages/company/CompanySpecialistRequestsPage';
import { CompanySpecialistsPage } from '@/pages/company/CompanySpecialistsPage';
import { CreateCompanyPage } from '@/pages/company/CreateCompanyPage';
import { HealthPage } from '@/pages/health/HealthPage';
import { SpecialistCompaniesPage } from '@/pages/specialist/SpecialistCompaniesPage';
import { SpecialistCompanyRequestsPage } from '@/pages/specialist/SpecialistCompanyRequestsPage';
import { SpecialistProfilePage } from '@/pages/specialist/SpecialistProfilePage';
import { SpecialistPublicPage } from '@/pages/specialists/SpecialistPublicPage';
import { SpecialistsListPage } from '@/pages/specialists/SpecialistsListPage';

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
  {
    path: '/company/:companyId/members',
    element: (
      <ProtectedRoute>
        <CompanyMembersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/company/:companyId/specialists',
    element: (
      <ProtectedRoute>
        <CompanySpecialistsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/company/:companyId/specialist-requests',
    element: (
      <ProtectedRoute>
        <CompanySpecialistRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/specialists',
    element: <SpecialistsListPage />,
  },
  {
    path: '/specialists/:specialistId',
    element: <SpecialistPublicPage />,
  },
  {
    path: '/specialist/profile',
    element: (
      <ProtectedRoute>
        <SpecialistProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/specialist/company-requests',
    element: (
      <ProtectedRoute>
        <SpecialistCompanyRequestsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/specialist/companies',
    element: (
      <ProtectedRoute>
        <SpecialistCompaniesPage />
      </ProtectedRoute>
    ),
  },
]);
