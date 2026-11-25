import { useEffect, useState } from 'react';

/**
 * Scroll-spy: the id of the section that currently crosses the middle of the screen, or ''
 * when none does (or the browser cannot tell). `watch` changes (for example the path) make it
 * look for the sections again.
 */
export function useActiveSection(ids, watch) {
  const [active, setActive] = useState('');

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') {
      setActive('');
      return undefined;
    }

    const crossing = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        // The first listed section on the line wins when two touch it at once.
        setActive(ids.find((id) => crossing.has(id)) ?? '');
      },
      // A thin band across the middle of the screen: the section on that line is the current one.
      { rootMargin: '-50% 0px -49% 0px' },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // `ids` is a stable list owned by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  return active;
}
