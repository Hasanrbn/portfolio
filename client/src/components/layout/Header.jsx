import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import siteConfig from '@portfolio/shared/siteConfig.json';
import Icon from '../ui/Icon.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { NAV_ITEMS } from '../../app/siteNavigation.js';
import { useScrolled } from '../../hooks/useScrolled.js';
import { classNames } from '../../utils/classNames.js';
import styles from './Header.module.css';

/**
 * Sticky site header. On wide screens the links sit in the bar; on small screens they live in
 * a menu panel opened by the menu button (a "disclosure": it is not modal, so focus is not
 * trapped). The panel closes on Escape (returning focus to the button), on a link click, on a
 * click outside, and when focus moves out of the header.
 */
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const panelId = useId();
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const header = headerRef.current;

    function handleKeyDown(event) {
      if (event.key !== 'Escape') {
        return;
      }
      const focusWasInsideHeader = header.contains(document.activeElement);
      setMenuOpen(false);
      if (focusWasInsideHeader) {
        menuButtonRef.current?.focus();
      }
    }

    function closeWhenOutside(event) {
      if (!header.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', closeWhenOutside);
    document.addEventListener('focusin', closeWhenOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', closeWhenOutside);
      document.removeEventListener('focusin', closeWhenOutside);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className={classNames(styles.header, scrolled && styles.scrolled)}>
      <div className={classNames('container', styles.bar)}>
        <Link to="/" className={styles.brand} onClick={closeMenu}>
          {siteConfig.name}
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls={panelId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>

        <div id={panelId} className={classNames(styles.panel, menuOpen && styles.open)}>
          <nav aria-label="Main">
            {/* role="list" keeps list semantics in Safari, which drops them when list-style is none. */}
            {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
            <ul role="list" className={styles.list}>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={styles.link}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.theme}>
            <ThemeToggle compact />
          </div>
        </div>
      </div>
    </header>
  );
}
