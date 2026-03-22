import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppLayout from '@/layouts/AppLayout';
import ThemeProvider from '@/components/ThemeProvider';

const withTheme = (element: ReactNode) => <ThemeProvider>{element}</ThemeProvider>;

export const router = createBrowserRouter([
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
