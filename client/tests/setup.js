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
  // Nor does it scroll elements into view; the menu uses this to reach a section.
  Element.prototype.scrollIntoView = vi.fn();
  // Nor does it draw on a canvas; say so quietly instead of logging an error on every call.
  HTMLCanvasElement.prototype.getContext = () => null;
  // Nor does it implement <dialog> modals, which the image viewer uses.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

afterEach(() => {
  if (!hasDom) return;
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  window.matchMedia = createMatchMedia(false);
});
