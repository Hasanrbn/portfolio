import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import SiteLayout from './SiteLayout.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import HomePage from '../pages/public/HomePage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';

// The design review page is development-only. Because the condition is a build-time
// constant, production builds drop both this line and its route.
const DesignPage = import.meta.env.DEV ? lazy(() => import('../pages/dev/DesignPage.jsx')) : null;

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
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
