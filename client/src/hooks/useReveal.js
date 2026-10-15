import { useLayoutEffect, useRef } from 'react';

/**
 * Makes an element fade and slide in the first time it is scrolled into view.
 *
 * Put the returned ref on the element. The effect is only an extra: the element is left
 * completely alone (visible, no attribute, no observer) when
 *  - it is already on screen when the page is first drawn, so nothing flashes or waits,
 *  - the visitor asked for reduced motion, or
 *  - the browser has no IntersectionObserver.
 * The hidden look comes only from a `data-reveal` attribute that is set here, after the page has
 * rendered, so content is never hidden in the HTML itself (see styles/reveal.css for the look).
 *
 * `delay` (milliseconds) lets neighbours in a grid appear one after another.
 */
export default function useReveal({ delay = 0 } = {}) {
  const ref = useRef(null);

  // A layout effect runs before the browser paints, so an element that starts hidden is never
  // seen visible for a frame first.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    // Measured before the hidden style is applied, which moves the element a little.
    if (element.getBoundingClientRect().top < window.innerHeight) return undefined;

    element.dataset.reveal = 'hidden';
    element.style.setProperty('--reveal-delay', `${delay}ms`);

    const observer = new IntersectionObserver(
      (entries) => {
        // An element that is already above the screen (the visitor jumped past it) is shown
        // straight away, since nobody would see it appear.
        const due = entries.some(
          (entry) => entry.isIntersecting || entry.boundingClientRect.top < 0,
        );
        if (due) {
          element.dataset.reveal = 'shown';
          observer.disconnect();
        }
      },
      // Waits until the element is a little way into the screen, not just touching its edge.
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      delete element.dataset.reveal;
      element.style.removeProperty('--reveal-delay');
    };
  }, [delay]);

  return ref;
}
