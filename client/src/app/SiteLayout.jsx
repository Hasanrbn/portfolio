import { Outlet } from 'react-router';
import Footer from '../components/layout/Footer.jsx';
import Header from '../components/layout/Header.jsx';
import SkipLink from '../components/layout/SkipLink.jsx';
import { useHashScroll } from '../hooks/useHashScroll.js';
import { useRouteFocus } from '../hooks/useRouteFocus.js';
import styles from './SiteLayout.module.css';

/** Frame shared by every public page: skip link, header, main content, footer. */
export default function SiteLayout() {
  useRouteFocus();
  useHashScroll();

  return (
    <div className={styles.layout}>
      <SkipLink />
      <Header />
      {/* Pages bring their own containers: the home page is a stack of full-width sections. */}
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
