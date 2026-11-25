import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router';
import SiteLayout from './SiteLayout.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import HomePage from '../pages/home/HomePage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';

// The design review page is development-only. Because the condition is a build-time
// constant, production builds drop both this line and its route.
const DesignPage = import.meta.env.DEV ? lazy(() => import('../pages/dev/DesignPage.jsx')) : null;

// The site used to have a page for each menu item. Those addresses now lead to the matching
// section of the home page, so old links and search results keep working.
const LEGACY_PAGES = [
  'about',
  'skills',
  'projects',
  'experience',
  'education',
  'certificates',
  'contact',
];

function LegacyProjectRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/#project-${slug}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {LEGACY_PAGES.map((id) => (
        <Route key={id} path={id} element={<Navigate to={`/#${id}`} replace />} />
      ))}
      <Route path="projects/:slug" element={<LegacyProjectRedirect />} />
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
