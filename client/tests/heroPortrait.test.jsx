import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroPortrait from '../src/pages/home/HeroPortrait.jsx';

const portraitOf = (container) => container.firstChild;
const images = (container) => [...container.querySelectorAll('img')];
const pose = (container) => portraitOf(container).dataset.pose;
const pullOf = (container) => Number(portraitOf(container).style.getPropertyValue('--pull'));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const wait = (ms) => act(() => vi.advanceTimersByTime(ms));

/** Presses the pointer on the portrait and drags it `distance` pixels to the left. */
function pullBy(container, distance, pointerType = 'mouse') {
  const portrait = portraitOf(container);
  fireEvent.pointerDown(portrait, { pointerType, pointerId: 1, button: 0, clientX: 600 });
  fireEvent.pointerMove(portrait, { pointerType, pointerId: 1, clientX: 600 - distance });
  wait(600);
}

describe('HeroPortrait', () => {
  it('shows the peeking pose with a text alternative and hides the other poses from assistive technology', () => {
    const { container } = render(<HeroPortrait name="Ada Lovelace" />);

    const named = screen.getByRole('img', { name: /Ada Lovelace/ });
    expect(named).toHaveAttribute('src', '/images/profile/peek.webp');
    expect(screen.getAllByRole('img')).toHaveLength(1);

    images(container)
      .slice(1)
      .forEach((img) => {
        expect(img).toHaveAttribute('alt', '');
        expect(img).toHaveAttribute('aria-hidden', 'true');
      });
  });

  it('gives every image its size so the page does not shift while they load', () => {
    const { container } = render(<HeroPortrait name="Ada Lovelace" />);

    images(container).forEach((img) => {
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    });
  });

  it('fetches the other poses only after the page has settled, or when they are wanted', () => {
    const { container, unmount } = render(<HeroPortrait name="Ada Lovelace" />);
    const others = () => images(container).slice(1);
    others().forEach((img) => expect(img).not.toHaveAttribute('src'));

    wait(2500);
    others().forEach((img) => expect(img).toHaveAttribute('src'));
    unmount();

    const second = render(<HeroPortrait name="Ada Lovelace" />);
    images(second.container)
      .slice(1)
      .forEach((img) => expect(img).not.toHaveAttribute('src'));
    fireEvent.pointerEnter(portraitOf(second.container), { pointerType: 'mouse' });
    images(second.container)
      .slice(1)
      .forEach((img) => expect(img).toHaveAttribute('src'));
  });

  it('cannot be selected or dragged away as a picture', () => {
    const { container } = render(<HeroPortrait name="Ada Lovelace" />);

    images(container).forEach((img) => expect(img).toHaveAttribute('draggable', 'false'));
    expect(fireEvent.dragStart(portraitOf(container))).toBe(false);
  });

  describe('hovering', () => {
    it('waves while the mouse is over it, and goes back', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      expect(pose(container)).toBe('peek');

      fireEvent.pointerEnter(portraitOf(container), { pointerType: 'mouse' });
      expect(pose(container)).toBe('wave');

      fireEvent.pointerLeave(portraitOf(container), { pointerType: 'mouse' });
      expect(pose(container)).toBe('peek');
    });
  });

  describe('pulling', () => {
    it('shows a hint until it is first touched', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      expect(container.textContent).toContain('Pull me!');

      fireEvent.pointerDown(portraitOf(container), { pointerType: 'mouse', button: 0 });
      expect(container.textContent).not.toContain('Pull me!');
    });

    it('hangs on by its hands when pulled a little, and strains when pulled hard', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);

      pullBy(container, 60);
      expect(pose(container)).toBe('cling1');
      const gentle = pullOf(container);

      pullBy(container, 400);
      expect(pose(container)).toBe('cling2');
      expect(pullOf(container)).toBeGreaterThan(gentle);
    });

    it('stays peeking while the drag is too small to count as a pull', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);

      pullBy(container, 10);
      expect(pose(container)).toBe('peek');
      expect(pullOf(container)).toBeGreaterThan(0);
    });

    it('does not pull when dragged away from the screen edge, towards the right', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);

      pullBy(container, -200);
      expect(pose(container)).toBe('peek');
      expect(pullOf(container)).toBe(0);
    });

    it('snaps back to the edge when let go away from the figure', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      pullBy(container, 400);
      expect(pose(container)).toBe('cling2');

      fireEvent.pointerUp(portraitOf(container), {
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });
      wait(2000);

      expect(pose(container)).toBe('peek');
      expect(pullOf(container)).toBe(0);
      expect(portraitOf(container)).toHaveAttribute('data-dragging', 'false');
    });

    it('waves with relief when let go while the pointer is still on the figure', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      pullBy(container, 400);

      // Without layout the figure's box is a point at the origin; releasing there is "on" it.
      fireEvent.pointerUp(portraitOf(container), {
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 0,
        clientY: 0,
      });
      wait(2000);

      expect(pose(container)).toBe('wave');
      expect(pullOf(container)).toBe(0);
    });

    it('marks the portrait as grabbed only while it is held', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      expect(portraitOf(container)).toHaveAttribute('data-dragging', 'false');

      fireEvent.pointerDown(portraitOf(container), { pointerType: 'mouse', button: 0 });
      expect(portraitOf(container)).toHaveAttribute('data-dragging', 'true');

      fireEvent.pointerCancel(portraitOf(container), { pointerType: 'mouse' });
      expect(portraitOf(container)).toHaveAttribute('data-dragging', 'false');
    });

    it('ignores the right mouse button', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);

      fireEvent.pointerDown(portraitOf(container), { pointerType: 'mouse', button: 2 });
      expect(portraitOf(container)).toHaveAttribute('data-dragging', 'false');
    });
  });

  describe('on a touch screen', () => {
    it('waves when tapped and returns by itself, since there is no hover to end it', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);

      fireEvent.pointerDown(portraitOf(container), { pointerType: 'touch' });
      fireEvent.pointerUp(portraitOf(container), { pointerType: 'touch' });
      expect(pose(container)).toBe('wave');

      wait(3000);
      expect(pose(container)).toBe('peek');
    });

    it('does not let the emulated mouse events of a tap cancel the wave', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      const portrait = portraitOf(container);

      fireEvent.pointerDown(portrait, { pointerType: 'touch' });
      fireEvent.pointerUp(portrait, { pointerType: 'touch' });
      fireEvent.pointerEnter(portrait, { pointerType: 'touch' });
      fireEvent.pointerLeave(portrait, { pointerType: 'touch' });

      expect(pose(container)).toBe('wave');
    });

    it('can be pulled with a finger as well', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);

      pullBy(container, 300, 'touch');
      expect(pose(container)).toBe('cling2');
    });
  });
});
