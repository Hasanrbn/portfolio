import { useLayoutEffect, useRef } from 'react';

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
 *
 * Many elements on the page use this hook at once, so the work is done in one batch: first every
 * element's place on the page is measured, then the hidden look is applied to all of them. Doing
 * it element by element makes the browser lay the whole page out again for each one (measure,
 * change, measure, change), which is slow on a phone.
 */

const jobs = [];
let scheduled = false;

function schedule(job) {
  jobs.push(job);
  if (scheduled) return;
  scheduled = true;
  // A microtask runs after the render that asked for it but before the browser paints, so an
  // element that starts hidden is never seen visible for a frame first.
  queueMicrotask(flush);
}

function flush() {
  scheduled = false;
  const batch = jobs.splice(0).filter((job) => !job.cancelled);

  // Read first: one layout for all of them.
  // "Below the first screen" is judged by the element's place on the page, not on the window.
  // When a link takes the visitor to a new page, the browser is still scrolled down for a
  // moment (the router scrolls to the top a little later), so a position measured against the
  // window would call everything "already on screen" and no effect would ever play.
  const places = batch.map((job) => job.element.getBoundingClientRect().top + window.scrollY);

  // Then write.
  batch.forEach((job, index) => {
    if (places[index] < window.innerHeight) return;
    job.hidden = true;
    job.element.dataset.reveal = 'hidden';
    job.element.style.setProperty('--reveal-delay', `${job.delay}ms`);
    watch(job);
  });
}

/**
 * Waits for the scroll position to settle, then watches for the element arriving. The router
 * scrolls to the top in an effect of its own, which runs in the same round of effects as this one
 * and so after it. An observer that started at once would take its first look at the page while it
 * is still scrolled down, find the element "in view" and reveal it before anyone could see it. A
 * timer of 0 ms waits until that scroll is done.
 */
function watch(job) {
  job.timer = setTimeout(() => {
    job.observer = new IntersectionObserver(
      (entries) => {
        // An element that is already above the screen (the visitor jumped past it) is shown
        // straight away, since nobody would see it appear.
        const due = entries.some(
          (entry) => entry.isIntersecting || entry.boundingClientRect.top < 0,
        );
        if (due) {
          job.element.dataset.reveal = 'shown';
          job.observer.disconnect();
        }
      },
      // Waits until the element is a little way into the screen, not just touching its edge.
      { rootMargin: '0px 0px -10% 0px' },
    );
    job.observer.observe(job.element);
  }, 0);
}

export default function useReveal({ delay = 0 } = {}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const job = { element, delay, cancelled: false, hidden: false, timer: 0, observer: null };
    schedule(job);

    return () => {
      job.cancelled = true;
      clearTimeout(job.timer);
      job.observer?.disconnect();
      if (job.hidden) {
        delete element.dataset.reveal;
        element.style.removeProperty('--reveal-delay');
      }
    };
  }, [delay]);

  return ref;
}
