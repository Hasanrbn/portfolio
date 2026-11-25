import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * A full page load scrolls to the top and puts keyboard and screen reader users at the start
 * of the new page. Client-side navigation does neither, so this hook does it: when the path
 * changes it scrolls to the top and moves focus to the new page's h1. (Moving between sections
 * of the home page is handled by useHashScroll.)
 *
 * Only the path matters, and the first render never steals focus.
 */
export function useRouteFocus() {
  const { pathname, hash } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;

    // Arriving at a section of the home page: the hash scroll takes it from here.
    if (pathname === '/' && hash) {
      return;
    }

    window.scrollTo(0, 0);

    // Falls back to <main> when the heading is not there yet (for example a lazy-loaded page).
    const target = document.querySelector('main h1') ?? document.getElementById('main-content');
    target?.setAttribute('tabindex', '-1');
    target?.focus({ preventScroll: true });
    // The hash is read only to tell the two cases apart, not to re-run on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}
