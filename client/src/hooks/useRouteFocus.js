import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * A full page load scrolls to the top and puts keyboard and screen reader users at the start
 * of the new page. Client-side navigation does neither, so this hook does it: when the path
 * changes it scrolls to the top and moves focus to the new page's h1.
 *
 * Only the path matters. Changes to the #hash alone (the skip link, in-page anchors) are left
 * to the browser, and the first render never steals focus.
 */
export function useRouteFocus() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;

    window.scrollTo(0, 0);

    // Falls back to <main> when the heading is not there yet (for example a lazy-loaded page).
    const target = document.querySelector('main h1') ?? document.getElementById('main-content');
    target?.setAttribute('tabindex', '-1');
    target?.focus({ preventScroll: true });
  }, [pathname]);
}
