import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import SiteLayout from './SiteLayout.jsx';
import { NAV_ITEMS, RESUME_ITEM } from './siteNavigation.js';
import Spinner from '../components/ui/Spinner.jsx';
import ComingSoonPage from '../pages/public/ComingSoonPage.jsx';
import AboutPage from '../pages/public/AboutPage.jsx';
import EducationPage from '../pages/public/EducationPage.jsx';
import ExperiencePage from '../pages/public/ExperiencePage.jsx';
import HomePage from '../pages/public/HomePage.jsx';
import ProjectDetailPage from '../pages/public/ProjectDetailPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';
import ProjectsPage from '../pages/public/ProjectsPage.jsx';
import SkillsPage from '../pages/public/SkillsPage.jsx';

// The design review page is development-only. Because the condition is a build-time
// constant, production builds drop both this line and its route.
const DesignPage = import.meta.env.DEV ? lazy(() => import('../pages/dev/DesignPage.jsx')) : null;

// Every navigation link needs a page to land on. Pages that are not built yet share a
// placeholder; when a real page is added, list it here and it leaves the placeholder set.
const BUILT_PAGES = [
  { to: '/about', element: <AboutPage /> },
  { to: '/skills', element: <SkillsPage /> },
  { to: '/projects', element: <ProjectsPage /> },
  { to: '/experience', element: <ExperiencePage /> },
  { to: '/education', element: <EducationPage /> },
];
const BUILT_PATHS = new Set(BUILT_PAGES.map((page) => page.to));
const COMING_SOON_PAGES = [...NAV_ITEMS, RESUME_ITEM].filter(
  (item) => item.to !== '/' && !BUILT_PATHS.has(item.to),
);

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        {BUILT_PAGES.map((page) => (
          <Route key={page.to} path={page.to} element={page.element} />
        ))}
        <Route path="projects/:slug" element={<ProjectDetailPage />} />
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
