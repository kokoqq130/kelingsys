import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppLayout from '@/layouts/AppLayout';
import DocumentsPage from '@/pages/DocumentsPage';
import LabsPage from '@/pages/LabsPage';
import OverviewPage from '@/pages/OverviewPage';
import SearchPage from '@/pages/SearchPage';
import TimelinePage from '@/pages/TimelinePage';
import ThemeProvider from '@/components/ThemeProvider';

const withTheme = (element: ReactNode) => <ThemeProvider>{element}</ThemeProvider>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: withTheme(<AppLayout />),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'timeline', element: <TimelinePage /> },
      { path: 'labs', element: <LabsPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'search', element: <SearchPage /> },
    ],
  },
]);
