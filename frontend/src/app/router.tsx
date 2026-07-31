import { createBrowserRouter } from 'react-router';

import { HealthPage } from '../pages/health/HealthPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HealthPage />,
  },
]);
