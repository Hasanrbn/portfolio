import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Makes an element fade and slide in the first time it is scrolled into view.
 *
 * Put the returned ref on the element. The effect is only an extra: the element is left
 * completely alone (visible, no attribute, no observer) when
 *  - it sits within the first screen of the page, so nothing flashes or waits,
 *  - the visitor asked for reduced motion, or
 *  - the browser has no IntersectionObserver.
 * The hidden look comes only from a `data-reveal` attribute that is set here, after the page has
 * rendered, so content is never hidden in the HTML itself (see styles/reveal.css for the look).
 *
 * `delay` (milliseconds) lets neighbours in a grid appear one after another.
 */
export default function useReveal({ delay = 0 } = {}) {
  const ref = useRef(null);

  // Step 1, before the browser paints, so an element that starts hidden is never seen visible
  // for a frame first.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    // "Below the first screen" is judged by the element's place on the page, not on the window.
    // When a link takes the visitor to a new page, the browser is still scrolled down for a
    // moment (the router scrolls to the top a little later), so a position measured against the
    // window would call everything "already on screen" and no effect would ever play.
    // Measured before the hidden style is applied, which moves the element a little.
    const placeOnPage = element.getBoundingClientRect().top + window.scrollY;
    if (placeOnPage < window.innerHeight) return undefined;

    element.dataset.reveal = 'hidden';
    element.style.setProperty('--reveal-delay', `${delay}ms`);

    return () => {
      delete element.dataset.reveal;
      element.style.removeProperty('--reveal-delay');
    };
  }, [delay]);

  // Step 2: wait for the scroll position to settle, then watch for the element arriving. The
  // router scrolls to the top in an effect of its own, which runs in this same round of effects
  // and so after this one. An observer that started now would take its first look at the page
  // while it is still scrolled down, find the element "in view" and reveal it before anyone
  // could see it. A timer of 0 ms waits until that scroll is done.
  useEffect(() => {
    const element = ref.current;
    if (!element || element.dataset.reveal !== 'hidden') return undefined;

    let observer;
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
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
    }, 0);

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [delay]);

  return ref;
}
