import { createBrowserRouter } from 'react-router';

import { LoginPage } from '../features/auth/ui/LoginPage';
import { ProtectedRoute } from '../features/auth/ui/ProtectedRoute';
import { RegisterPage } from '../features/auth/ui/RegisterPage';
import { AppHomePage } from '../pages/app/AppHomePage';
import { HealthPage } from '../pages/health/HealthPage';

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
]);
