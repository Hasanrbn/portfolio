import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import SiteLayout from './SiteLayout.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import AboutPage from '../pages/public/AboutPage.jsx';
import BlogPage from '../pages/public/BlogPage.jsx';
import BlogPostPage from '../pages/public/BlogPostPage.jsx';
import CertificatesPage from '../pages/public/CertificatesPage.jsx';
import ContactPage from '../pages/public/ContactPage.jsx';
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

// Every item in the navigation (siteNavigation.js) needs a route here; the layout test checks it.
const BUILT_PAGES = [
  { to: '/about', element: <AboutPage /> },
  { to: '/skills', element: <SkillsPage /> },
  { to: '/projects', element: <ProjectsPage /> },
  { to: '/experience', element: <ExperiencePage /> },
  { to: '/education', element: <EducationPage /> },
  { to: '/certificates', element: <CertificatesPage /> },
  { to: '/blog', element: <BlogPage /> },
  { to: '/contact', element: <ContactPage /> },
];

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        {BUILT_PAGES.map((page) => (
          <Route key={page.to} path={page.to} element={page.element} />
        ))}
        <Route path="projects/:slug" element={<ProjectDetailPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
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
