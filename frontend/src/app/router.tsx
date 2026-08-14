import { createBrowserRouter } from 'react-router';

import { AppShell } from '@/app/AppShell';
import { LoginPage } from '@/features/auth/ui/LoginPage';
import { ProtectedRoute } from '@/features/auth/ui/ProtectedRoute';
import { RegisterPage } from '@/features/auth/ui/RegisterPage';
import { AppHomePage } from '@/pages/app/AppHomePage';
import { MyAppointmentsPage } from '@/pages/app/MyAppointmentsPage';
import { NotificationsPage } from '@/pages/app/NotificationsPage';
import { ProfilePage } from '@/pages/app/ProfilePage';
import { RequestAppointmentPage } from '@/pages/appointments/RequestAppointmentPage';
import { CompaniesListPage } from '@/pages/companies/CompaniesListPage';
import { CompanyPublicPage } from '@/pages/companies/CompanyPublicPage';
import { CompanyAppointmentsPage } from '@/pages/company/CompanyAppointmentsPage';
import { CompanyDashboardPage } from '@/pages/company/CompanyDashboardPage';
import { CompanyMembersPage } from '@/pages/company/CompanyMembersPage';
import { CompanyProfilePage } from '@/pages/company/CompanyProfilePage';
import { CompanyServicesPage } from '@/pages/company/CompanyServicesPage';
import { CompanySpecialistRequestsPage } from '@/pages/company/CompanySpecialistRequestsPage';
import { CompanySpecialistsPage } from '@/pages/company/CompanySpecialistsPage';
import { CreateCompanyPage } from '@/pages/company/CreateCompanyPage';
import { ServiceSpecialistsPage } from '@/pages/company/ServiceSpecialistsPage';
import { HealthPage } from '@/pages/health/HealthPage';
import { ServicePublicPage } from '@/pages/services/ServicePublicPage';
import { ServicesListPage } from '@/pages/services/ServicesListPage';
import { SpecialistCompaniesPage } from '@/pages/specialist/SpecialistCompaniesPage';
import { SpecialistCompanyRequestsPage } from '@/pages/specialist/SpecialistCompanyRequestsPage';
import { SpecialistProfilePage } from '@/pages/specialist/SpecialistProfilePage';
import { SpecialistServicesPage } from '@/pages/specialist/SpecialistServicesPage';
import { SpecialistPublicPage } from '@/pages/specialists/SpecialistPublicPage';
import { SpecialistsListPage } from '@/pages/specialists/SpecialistsListPage';
import { RabbitMqLabPage } from '@/pages/student/RabbitMqLabPage';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
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
        path: '/app/appointments',
        element: (
          <ProtectedRoute>
            <MyAppointmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/app/notifications',
        element: (
          <ProtectedRoute>
            <NotificationsPage />
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
        path: '/company/:companyId/services',
        element: (
          <ProtectedRoute>
            <CompanyServicesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/company/:companyId/services/:serviceId/specialists',
        element: (
          <ProtectedRoute>
            <ServiceSpecialistsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/company/:companyId/appointments',
        element: (
          <ProtectedRoute>
            <CompanyAppointmentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/services',
        element: <ServicesListPage />,
      },
      {
        path: '/services/:serviceId',
        element: <ServicePublicPage />,
      },
      {
        path: '/services/:serviceId/book',
        element: (
          <ProtectedRoute>
            <RequestAppointmentPage />
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
      {
        path: '/specialist/services',
        element: (
          <ProtectedRoute>
            <SpecialistServicesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/rabbitmq',
        element: <RabbitMqLabPage />,
      },
    ],
  },
]);
