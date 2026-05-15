import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { App } from '~/App';
import { Placeholder } from '~/routes/Placeholder';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Placeholder page="show" /> },
      { path: 'fleet', element: <Placeholder page="fleet" /> },
      { path: 'choreography', element: <Placeholder page="choreography" /> },
      { path: 'schedule', element: <Placeholder page="schedule" /> },
      { path: '*', element: <Placeholder page="404" /> },
    ],
  },
]);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element missing in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
