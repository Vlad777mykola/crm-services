import { createBrowserRouter } from 'react-router';

import { AppShell } from '@/app/layouts/AppShell';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { PublicLayout } from '@/app/layouts/PublicLayout';
import { WorkspaceLayout } from '@/app/layouts/WorkspaceLayout';
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
import { CompanyAvailabilityPage } from '@/pages/company/CompanyAvailabilityPage';
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
import { SpecialistAppointmentsPage } from '@/pages/specialist/SpecialistAppointmentsPage';
import { SpecialistAvailabilityPage } from '@/pages/specialist/SpecialistAvailabilityPage';
import { SpecialistCompaniesPage } from '@/pages/specialist/SpecialistCompaniesPage';
import { SpecialistCompanyRequestsPage } from '@/pages/specialist/SpecialistCompanyRequestsPage';
import { SpecialistDashboardPage } from '@/pages/specialist/SpecialistDashboardPage';
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
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HealthPage /> },
          { path: 'companies', element: <CompaniesListPage /> },
          { path: 'companies/:companyId', element: <CompanyPublicPage /> },
          { path: 'services', element: <ServicesListPage /> },
          { path: 'services/:serviceId', element: <ServicePublicPage /> },
          { path: 'specialists', element: <SpecialistsListPage /> },
          { path: 'specialists/:specialistId', element: <SpecialistPublicPage /> },
          { path: 'student/rabbitmq', element: <RabbitMqLabPage /> },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'app', element: <AppHomePage /> },
          { path: 'app/profile', element: <ProfilePage /> },
          { path: 'app/appointments', element: <MyAppointmentsPage /> },
          { path: 'app/notifications', element: <NotificationsPage /> },
          { path: 'company/create', element: <CreateCompanyPage /> },
          { path: 'services/:serviceId/book', element: <RequestAppointmentPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'specialist', element: <SpecialistDashboardPage /> },
          { path: 'specialist/profile', element: <SpecialistProfilePage /> },
          { path: 'specialist/appointments', element: <SpecialistAppointmentsPage /> },
          { path: 'specialist/company-requests', element: <SpecialistCompanyRequestsPage /> },
          { path: 'specialist/companies', element: <SpecialistCompaniesPage /> },
          { path: 'specialist/services', element: <SpecialistServicesPage /> },
          { path: 'specialist/availability', element: <SpecialistAvailabilityPage /> },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: 'company/:companyId', element: <CompanyDashboardPage /> },
          { path: 'company/:companyId/dashboard', element: <CompanyDashboardPage /> },
          { path: 'company/:companyId/profile', element: <CompanyProfilePage /> },
          { path: 'company/:companyId/members', element: <CompanyMembersPage /> },
          { path: 'company/:companyId/specialists', element: <CompanySpecialistsPage /> },
          { path: 'company/:companyId/specialist-requests', element: <CompanySpecialistRequestsPage /> },
          { path: 'company/:companyId/services', element: <CompanyServicesPage /> },
          { path: 'company/:companyId/services/:serviceId/specialists', element: <ServiceSpecialistsPage /> },
          { path: 'company/:companyId/appointments', element: <CompanyAppointmentsPage /> },
          { path: 'company/:companyId/availability', element: <CompanyAvailabilityPage /> },
        ],
      },
    ],
  },
]);
