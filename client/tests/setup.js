import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no matchMedia. Default to "light, no preference"; tests that care override it.
function createMatchMedia(matches = false) {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

// A few test files opt out of jsdom (they only read files), so guard browser-only setup.
const hasDom = typeof window !== 'undefined';

if (hasDom) {
  window.matchMedia = createMatchMedia(false);
  // jsdom does not implement scrolling; navigation code calls it, so make it a no-op.
  window.scrollTo = vi.fn();
}

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  window.matchMedia = createMatchMedia(false);
});
