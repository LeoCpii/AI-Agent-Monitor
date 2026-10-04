import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import App from '@/App';

const DashboardPage = lazy(() => import('@/pages/Dashboard'));

export const router = createBrowserRouter([
  {
    path: '',
    element: (
      <App />
    ),
    children: [
      {
        path: '/',
        element: <Navigate to='/dashboard' />,
      },
      {
        path: '/dashboard',
        loader: () => document.title = 'AI Agent Monitor - Dashboard',
        element: <DashboardPage />,
      },
      {
        path: '*',
        element: <Navigate to='/dashboard' />,
      }
    ]
  },
]);
