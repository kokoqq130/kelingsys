import type { ReactNode } from 'react';
import { createBrowserRouter, createHashRouter } from 'react-router-dom';

import { routerMode } from '@/api/runtime';
import AppLayout from '@/layouts/AppLayout';
import ThemeProvider from '@/components/ThemeProvider';

const withTheme = (element: ReactNode) => <ThemeProvider>{element}</ThemeProvider>;

const createRouter = routerMode === 'hash' ? createHashRouter : createBrowserRouter;

export const router = createRouter([
  {
    path: '/',
    element: withTheme(<AppLayout />),
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/pages/OverviewPage')).default }),
      },
      {
        path: 'timeline',
        lazy: async () => ({ Component: (await import('@/pages/TimelinePage')).default }),
      },
      {
        path: 'medications',
        lazy: async () => ({ Component: (await import('@/pages/MedicationsPage')).default }),
      },
      {
        path: 'labs',
        lazy: async () => ({ Component: (await import('@/pages/LabsPage')).default }),
      },
      {
        path: 'documents',
        lazy: async () => ({ Component: (await import('@/pages/DocumentsPage')).default }),
      },
      {
        path: 'files',
        lazy: async () => ({ Component: (await import('@/pages/FilesPage')).default }),
      },
      {
        path: 'search',
        lazy: async () => ({ Component: (await import('@/pages/SearchPage')).default }),
      },
    ],
  },
]);
