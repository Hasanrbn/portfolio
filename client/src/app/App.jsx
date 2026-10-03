import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import SiteLayout from './SiteLayout.jsx';
import { NAV_ITEMS, RESUME_ITEM } from './siteNavigation.js';
import Spinner from '../components/ui/Spinner.jsx';
import ComingSoonPage from '../pages/public/ComingSoonPage.jsx';
import HomePage from '../pages/public/HomePage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';

// The design review page is development-only. Because the condition is a build-time
// constant, production builds drop both this line and its route.
const DesignPage = import.meta.env.DEV ? lazy(() => import('../pages/dev/DesignPage.jsx')) : null;

// Every navigation link needs a page to land on. Pages that are not built yet share a
// placeholder; when a real page is added, give it its own <Route> and it replaces this one.
const COMING_SOON_PAGES = [...NAV_ITEMS.filter((item) => item.to !== '/'), RESUME_ITEM];

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        {COMING_SOON_PAGES.map((page) => (
          <Route key={page.to} path={page.to} element={<ComingSoonPage title={page.label} />} />
        ))}
        {DesignPage && (
          <Route
            path="design"
            element={
              <Suspense fallback={<Spinner />}>
                <DesignPage />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
