import { Outlet } from 'react-router';

// Minimal shell. Header, navigation, footer and skip link arrive in Phase 3.
export default function SiteLayout() {
  return (
    <main id="main-content" className="container section">
      <Outlet />
    </main>
  );
}
