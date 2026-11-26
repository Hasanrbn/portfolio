import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroPortrait from '../src/pages/home/HeroPortrait.jsx';

const wrapper = (container) => container.firstChild;

describe('HeroPortrait', () => {
  it('shows the first pose with a text alternative and hides the second from assistive technology', () => {
    const { container } = render(<HeroPortrait name="Ada Lovelace" />);

    const named = screen.getByRole('img', { name: /Ada Lovelace/ });
    expect(named).toHaveAttribute('src', '/images/profile/peek.webp');
    expect(screen.getAllByRole('img')).toHaveLength(1);

    const wave = container.querySelectorAll('img')[1];
    expect(wave).toHaveAttribute('alt', '');
    expect(wave).toHaveAttribute('aria-hidden', 'true');
  });

  it('fetches the waving pose only after the page has settled, or when it is wanted', () => {
    vi.useFakeTimers();
    try {
      const { container, unmount } = render(<HeroPortrait name="Ada Lovelace" />);
      const wave = () => container.querySelectorAll('img')[1];
      expect(wave()).not.toHaveAttribute('src');

      act(() => vi.advanceTimersByTime(2000));
      expect(wave()).toHaveAttribute('src', '/images/profile/wave.webp');
      unmount();

      const second = render(<HeroPortrait name="Ada Lovelace" />);
      const early = second.container.querySelectorAll('img')[1];
      expect(early).not.toHaveAttribute('src');
      fireEvent.pointerEnter(second.container.firstChild, { pointerType: 'mouse' });
      expect(early).toHaveAttribute('src', '/images/profile/wave.webp');
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives both images their size so the page does not shift while they load', () => {
    const { container } = render(<HeroPortrait name="Ada Lovelace" />);

    container.querySelectorAll('img').forEach((img) => {
      expect(img).toHaveAttribute('width', '614');
      expect(img).toHaveAttribute('height', '1200');
    });
  });

  it('starts on the peeking pose, waves while the mouse is over it, and goes back', () => {
    const { container } = render(<HeroPortrait name="Ada Lovelace" />);
    const portrait = wrapper(container);
    expect(portrait).toHaveAttribute('data-waving', 'false');

    fireEvent.pointerEnter(portrait, { pointerType: 'mouse' });
    expect(portrait).toHaveAttribute('data-waving', 'true');

    fireEvent.pointerLeave(portrait, { pointerType: 'mouse' });
    expect(portrait).toHaveAttribute('data-waving', 'false');
  });

  describe('on a touch screen', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('waves when tapped and returns by itself, since there is no hover to end it', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      const portrait = wrapper(container);

      fireEvent.pointerDown(portrait, { pointerType: 'touch' });
      expect(portrait).toHaveAttribute('data-waving', 'true');

      act(() => vi.advanceTimersByTime(3000));
      expect(portrait).toHaveAttribute('data-waving', 'false');
    });

    it('does not let the emulated mouse events of a tap cancel the wave', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      const portrait = wrapper(container);

      fireEvent.pointerDown(portrait, { pointerType: 'touch' });
      fireEvent.pointerEnter(portrait, { pointerType: 'touch' });
      fireEvent.pointerLeave(portrait, { pointerType: 'touch' });

      expect(portrait).toHaveAttribute('data-waving', 'true');
    });

    it('keeps waving for a full hold after a second tap', () => {
      const { container } = render(<HeroPortrait name="Ada Lovelace" />);
      const portrait = wrapper(container);

      fireEvent.pointerDown(portrait, { pointerType: 'touch' });
      act(() => vi.advanceTimersByTime(2000));
      fireEvent.pointerDown(portrait, { pointerType: 'touch' });
      act(() => vi.advanceTimersByTime(2000));

      expect(portrait).toHaveAttribute('data-waving', 'true');
    });
  });
});
