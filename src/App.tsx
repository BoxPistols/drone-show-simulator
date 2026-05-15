import { Outlet } from 'react-router-dom';

/**
 * Root layout. P2 will mount the chrome (top nav + brand + status pill)
 * and a `<main>` outlet here. For Phase 1 it's just the routing scaffold.
 */
export function App() {
  return <Outlet />;
}
