import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '~/components/layout/AppShell';
import { FullscreenLayout } from '~/components/layout/FullscreenLayout';
import { Boot } from '~/components/ui/Boot';
import { ToastProvider } from '~/components/ui/ToastProvider';
import { RouteError } from '~/components/ui/RouteError';
import { NotFoundPage } from '~/routes/NotFoundPage';
import '~/styles/global.css';

// index.html が preload だけ始めた Web フォントをここで適用する（描画をブロックさせないため）
const webfonts = document.getElementById('webfonts');
if (webfonts instanceof HTMLLinkElement && webfonts.rel !== 'stylesheet') {
  webfonts.rel = 'stylesheet';
}

/*
 * 各ページは route の lazy で分割する。Three.js（最も重いチャンク）は観賞ページだけが読み込み、
 * /fleet /choreography /schedule を直接開いたときには一切ダウンロードしない。
 * 画面遷移中は現在のページを表示したまま次のチャンクを待つので、Suspense のちらつきも出ない。
 * 初回だけは HydrateFallback（index.html と同じ読み込み表示）を出し、真っ暗な瞬間を作らない。
 * チャンクの取得に失敗したら、再読み込みの導線がある RouteError を出す。
 */
const router = createBrowserRouter(
  [
    {
      element: <FullscreenLayout />,
      HydrateFallback: Boot,
      errorElement: <RouteError />,
      children: [
        {
          path: '/',
          lazy: () => import('~/routes/show/ShowPage').then((m) => ({ Component: m.ShowPage })),
        },
      ],
    },
    {
      element: <AppShell />,
      HydrateFallback: Boot,
      errorElement: <RouteError />,
      children: [
        {
          path: '/fleet',
          lazy: () => import('~/routes/fleet/FleetPage').then((m) => ({ Component: m.FleetPage })),
        },
        {
          path: '/choreography',
          lazy: () =>
            import('~/routes/choreography/ChoreographyPage').then((m) => ({
              Component: m.ChoreographyPage,
            })),
        },
        {
          path: '/schedule',
          lazy: () =>
            import('~/routes/schedule/SchedulePage').then((m) => ({ Component: m.SchedulePage })),
        },
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
