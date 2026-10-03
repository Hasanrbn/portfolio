import { Link } from 'react-router';
import siteConfig from '@portfolio/shared/siteConfig.json';
import SocialLinks from '../sections/SocialLinks.jsx';
import { NAV_ITEMS, RESUME_ITEM } from '../../app/siteNavigation.js';
import { classNames } from '../../utils/classNames.js';
import { getSocialLinks } from '../../utils/socialLinks.js';
import styles from './Footer.module.css';

const FOOTER_LINKS = [...NAV_ITEMS, RESUME_ITEM];

export default function Footer() {
  const socialLinks = getSocialLinks(siteConfig);
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={classNames('container', styles.inner)}>
        <div>
          <p className={styles.name}>{siteConfig.name}</p>
          <p className={styles.description}>
            {siteConfig.role} based in {siteConfig.location}.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className={styles.caption}>Pages</h2>
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
          <ul role="list" className={styles.links}>
            {FOOTER_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {socialLinks.length > 0 && (
          <div>
            <h2 className={styles.caption}>Connect</h2>
            <SocialLinks links={socialLinks} />
          </div>
        )}
      </div>

      <div className={classNames('container', styles.bottom)}>
        <p>
          © {year} {siteConfig.name}
        </p>
        <p>Built with React, Vite and Express.</p>
      </div>
    </footer>
  );
}
