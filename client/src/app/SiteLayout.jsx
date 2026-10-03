import { Outlet } from 'react-router';

// Minimal shell for Phase 1. Header, navigation, footer and skip link arrive in Phase 3.
export default function SiteLayout() {
  return (
    <main id="main-content" className="page">
      <Outlet />
    </main>
  );
}
