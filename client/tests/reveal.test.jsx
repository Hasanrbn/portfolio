import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TextSection from '../src/components/sections/TextSection.jsx';
import useReveal from '../src/hooks/useReveal.js';

function Box({ delay }) {
  const ref = useReveal({ delay });
  return (
    <p ref={ref} data-testid="box">
      Hello
    </p>
  );
}

let observers;

class FakeObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    this.disconnect = vi.fn();
    observers.push(this);
  }

  observe(element) {
    this.observed.push(element);
  }

  /** Pretends the browser reported the element at the given place. */
  report({ isIntersecting, top = 500 }) {
    act(() => {
      this.callback([{ isIntersecting, boundingClientRect: { top } }]);
    });
  }
}

/** Puts every element at the given distance from the top of the window. */
function placeElementsAt(top) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top });
}

function stubReducedMotion(reduce) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query) => ({ matches: reduce && query.includes('reduce'), media: query })),
  );
}

/** Lets the hook's 0 ms wait pass, after which its observer exists. */
function settle() {
  act(() => {
    vi.advanceTimersByTime(0);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  stubReducedMotion(false);
  window.innerHeight = 800;
  window.scrollY = 0;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useReveal', () => {
  it('hides an element below the first screen until it is scrolled to', () => {
    placeElementsAt(1500);
    render(<Box delay={160} />);
    settle();
    const box = screen.getByTestId('box');

    expect(box).toHaveAttribute('data-reveal', 'hidden');
    expect(box.style.getPropertyValue('--reveal-delay')).toBe('160ms');
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([box]);

    observers[0].report({ isIntersecting: false });
    expect(box).toHaveAttribute('data-reveal', 'hidden');

    observers[0].report({ isIntersecting: true });
    expect(box).toHaveAttribute('data-reveal', 'shown');
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it('shows an element straight away when the visitor already scrolled past it', () => {
    placeElementsAt(1500);
    render(<Box />);
    settle();

    observers[0].report({ isIntersecting: false, top: -300 });

    expect(screen.getByTestId('box')).toHaveAttribute('data-reveal', 'shown');
  });

  it('leaves an element that is on screen at the start alone', () => {
    placeElementsAt(120);
    render(<Box />);

    expect(screen.getByTestId('box')).not.toHaveAttribute('data-reveal');
    expect(observers).toHaveLength(0);
  });

  it('still hides an element below the first screen right after a link opened the page', () => {
    // The browser is still scrolled down from the previous page, so this element looks like it
    // is on screen (100 px from the top of the window), but on the new page it sits at 1300 px.
    window.scrollY = 1200;
    placeElementsAt(100);
    render(<Box />);

    expect(screen.getByTestId('box')).toHaveAttribute('data-reveal', 'hidden');
  });

  it('leaves an element in the first screen of the page alone even when scrolled past it', () => {
    // A reload in the middle of a page: the element is 1500 px above the window, which is
    // 500 px from the top of the page.
    window.scrollY = 2000;
    placeElementsAt(-1500);
    render(<Box />);

    expect(screen.getByTestId('box')).not.toHaveAttribute('data-reveal');
    expect(observers).toHaveLength(0);
  });

  it('leaves everything visible when the visitor asked for reduced motion', () => {
    stubReducedMotion(true);
    placeElementsAt(1500);
    render(<Box />);

    expect(screen.getByTestId('box')).not.toHaveAttribute('data-reveal');
    expect(observers).toHaveLength(0);
  });

  it('leaves everything visible when the browser has no IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    placeElementsAt(1500);
    render(<Box />);

    expect(screen.getByTestId('box')).not.toHaveAttribute('data-reveal');
  });

  it('stops watching when the element goes away', () => {
    placeElementsAt(1500);
    const { unmount } = render(<Box />);
    settle();
    const [observer] = observers;

    unmount();

    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('does not start watching until the scroll position has settled', () => {
    // The router scrolls a new page to the top in an effect that runs just after the element
    // renders. An observer that looked sooner would see the page still scrolled down.
    placeElementsAt(1500);
    render(<Box />);

    expect(screen.getByTestId('box')).toHaveAttribute('data-reveal', 'hidden');
    expect(observers).toHaveLength(0);

    settle();

    expect(observers).toHaveLength(1);
  });

  it('never creates the observer when the element is gone before the scroll settles', () => {
    placeElementsAt(1500);
    const { unmount } = render(<Box />);

    unmount();
    settle();

    expect(observers).toHaveLength(0);
  });
});

describe('text sections on the About page', () => {
  it('ease in when they start below the first screen, and still hold their text', () => {
    placeElementsAt(1500);
    render(<TextSection title="Interests" paragraphs={['I like building things.']} />);
    settle();

    const section = screen.getByRole('region', { name: 'Interests' });
    expect(section).toHaveAttribute('data-reveal', 'hidden');
    expect(section).toHaveTextContent('I like building things.');

    observers[0].report({ isIntersecting: true });
    expect(section).toHaveAttribute('data-reveal', 'shown');
  });
});
