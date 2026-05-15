import { Outlet, useLocation } from 'react-router-dom';
import { NavBar } from './NavBar';

/**
 * Standard ops-page layout — top nav + scrollable main outlet.
 * The Show page uses FullscreenLayout instead because Three.js
 * paints over the entire viewport.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const isShow = pathname === '/';
  return (
    <>
      <a href="#main" className="skip-link">
        メインコンテンツへスキップ
      </a>
      <NavBar showLivePill={isShow} />
      <div className="ops-wrap" id="main" role="main">
        <Outlet />
      </div>
    </>
  );
}
