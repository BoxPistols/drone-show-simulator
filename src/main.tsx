import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '~/components/layout/AppShell';
import { FullscreenLayout } from '~/components/layout/FullscreenLayout';
import { ToastProvider } from '~/components/ui/ToastProvider';
import { ChoreographyPage } from '~/routes/choreography/ChoreographyPage';
import { FleetPage } from '~/routes/fleet/FleetPage';
import { NotFoundPage } from '~/routes/NotFoundPage';
import { SchedulePage } from '~/routes/schedule/SchedulePage';
import { ShowPage } from '~/routes/show/ShowPage';
import '~/styles/global.css';

const router = createBrowserRouter(
  [
    {
      element: <FullscreenLayout />,
      children: [{ path: '/', element: <ShowPage /> }],
    },
    {
      element: <AppShell />,
      children: [
        { path: '/fleet', element: <FleetPage /> },
        { path: '/choreography', element: <ChoreographyPage /> },
        { path: '/schedule', element: <SchedulePage /> },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element missing in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </StrictMode>
);
