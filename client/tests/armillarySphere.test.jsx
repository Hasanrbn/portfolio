import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ArmillarySphere from '../src/components/sections/ArmillarySphere.jsx';

function fakeContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
  };
}

const original = HTMLCanvasElement.prototype.getContext;
const originalRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext());
  Element.prototype.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 320,
    height: 320,
    right: 320,
    bottom: 320,
  });
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = original;
  Element.prototype.getBoundingClientRect = originalRect;
  vi.restoreAllMocks();
});

function setReducedMotion(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: matches && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('ArmillarySphere', () => {
  it('keeps its content readable and hides the decorative rings', () => {
    const { container } = render(
      <ArmillarySphere>
        <img src="/me.jpg" alt="Ada Lovelace" />
      </ArmillarySphere>,
    );

    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toBeInTheDocument();
    const canvases = container.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);
    canvases.forEach((canvas) => expect(canvas).toHaveAttribute('aria-hidden', 'true'));
  });

  it('puts the picture between the back and front rings', () => {
    const { container } = render(
      <ArmillarySphere>
        <img src="/me.jpg" alt="Ada Lovelace" />
      </ArmillarySphere>,
    );
    const order = [...container.firstChild.children].map((node) => node.tagName);

    expect(order).toEqual(['CANVAS', 'DIV', 'CANVAS']);
    expect(container.firstChild.children[1]).toContainElement(screen.getByRole('img'));
  });

  it('keeps turning the rings and stops when it is removed', () => {
    setReducedMotion(false);
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { unmount } = render(<ArmillarySphere>x</ArmillarySphere>);
    expect(request).toHaveBeenCalled();

    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('draws the rings once and does not animate with reduced motion', () => {
    setReducedMotion(true);
    const request = vi.spyOn(window, 'requestAnimationFrame');
    const ctx = fakeContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);

    render(<ArmillarySphere>x</ArmillarySphere>);

    expect(request).not.toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('still renders its content when the browser cannot draw on a canvas', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    render(<ArmillarySphere>hello</ArmillarySphere>);

    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
