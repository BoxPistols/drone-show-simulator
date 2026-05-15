import { Outlet } from 'react-router-dom';

/**
 * Bare-bones layout for the immersive Show page. The page itself paints
 * its own chrome (top brand, programme bar, transport) on top of the
 * Three.js canvas, so this layout deliberately renders no shell.
 */
export function FullscreenLayout() {
  return (
    <>
      <a href="#main" className="skip-link">
        メインコンテンツへスキップ
      </a>
      <main id="main">
        <Outlet />
      </main>
    </>
  );
}
