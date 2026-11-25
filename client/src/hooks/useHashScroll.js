import { useEffect } from 'react';
import { useLocation } from 'react-router';

// How long the page may still be growing (data arriving, images sizing) after a jump.
const SETTLE_MS = 1500;
// How long to wait for a section that is not on the page yet (a project that is still loading).
const WAIT_MS = 3000;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Menu links are addresses like "/#projects". The router changes the address but does not
 * scroll, so this hook does: it scrolls to the section named by the #hash (smoothly, unless the
 * visitor asked for reduced motion) and moves focus to that section's heading so keyboard and
 * screen reader users arrive where the page did. It runs again when the same link is clicked
 * twice (a new `key`), and on the first load of an address that already has a hash.
 *
 * Sections fill in as their data arrives, which moves everything below them. So after the jump
 * the hook keeps the section in place for a moment, and waits for a section that does not exist
 * yet. Any scroll, key press or touch by the visitor ends that at once.
 */
export function useHashScroll() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (pathname !== '/' || !hash) return undefined;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // An address with a broken escape matches no section.
    }

    const cleanups = [];
    const stop = () => cleanups.splice(0).forEach((cleanup) => cleanup());

    function jump(behavior) {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ behavior, block: 'start' });
      return true;
    }

    function arrive() {
      const target = document.getElementById(id);
      const heading = target.querySelector('h1, h2, h3') ?? target;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });

      // Keep the section in place while the page above it is still growing.
      const main = document.getElementById('main-content');
      if (main && typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => jump('auto'));
        resizeObserver.observe(main);
        const timer = setTimeout(stop, SETTLE_MS);
        const visitorEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
        visitorEvents.forEach((name) => window.addEventListener(name, stop, { passive: true }));
        cleanups.push(() => {
          resizeObserver.disconnect();
          clearTimeout(timer);
          visitorEvents.forEach((name) => window.removeEventListener(name, stop));
        });
      }
    }

    if (jump(prefersReducedMotion() ? 'auto' : 'smooth')) {
      arrive();
    } else if (typeof MutationObserver !== 'undefined') {
      // The section is not there yet: wait for it to be rendered.
      const mutationObserver = new MutationObserver(() => {
        if (document.getElementById(id)) {
          stop();
          jump('auto');
          arrive();
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(stop, WAIT_MS);
      cleanups.push(() => {
        mutationObserver.disconnect();
        clearTimeout(timer);
      });
    }

    return stop;
  }, [pathname, hash, key]);
}
