import { Outlet } from 'react-router';
import Footer from '../components/layout/Footer.jsx';
import Header from '../components/layout/Header.jsx';
import SkipLink from '../components/layout/SkipLink.jsx';
import { useRouteFocus } from '../hooks/useRouteFocus.js';
import { classNames } from '../utils/classNames.js';
import styles from './SiteLayout.module.css';

/** Frame shared by every public page: skip link, header, main content, footer. */
export default function SiteLayout() {
  useRouteFocus();

  return (
    <div className={styles.layout}>
      <SkipLink />
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className={classNames('container', 'section', styles.main)}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
