import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import ThemeToggle from '../src/components/layout/ThemeToggle.jsx';
import { useTheme } from '../src/hooks/useTheme.js';
import { THEME_STORAGE_KEY } from '../src/utils/theme.js';

/** Replaces matchMedia with a controllable "does the OS prefer dark?" source. */
function mockSystemTheme(initiallyDark) {
  let matches = initiallyDark;
  const listeners = new Set();

  window.matchMedia = vi.fn().mockImplementation((query) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  }));

  return {
    setDark(next) {
      matches = next;
      act(() => listeners.forEach((listener) => listener({ matches: next })));
    },
  };
}

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

const currentTheme = () => document.documentElement.dataset.theme;
const option = (name) => screen.getByRole('button', { name });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('theme switching', () => {
  it('follows the operating system by default', () => {
    mockSystemTheme(true);

    renderToggle();

    expect(currentTheme()).toBe('dark');
    expect(option('System')).toHaveAttribute('aria-pressed', 'true');
  });

  it('prefers a stored choice over the operating system', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    mockSystemTheme(true);

    renderToggle();

    expect(currentTheme()).toBe('light');
    expect(option('Light')).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'banana');
    mockSystemTheme(false);

    renderToggle();

    expect(currentTheme()).toBe('light');
    expect(option('System')).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies and remembers the chosen theme', async () => {
    const user = userEvent.setup();
    mockSystemTheme(false);
    renderToggle();

    await user.click(option('Dark'));

    expect(currentTheme()).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(option('Dark')).toHaveAttribute('aria-pressed', 'true');
    expect(option('Light')).toHaveAttribute('aria-pressed', 'false');

    await user.click(option('System'));

    expect(currentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('tracks operating system changes while set to System', () => {
    const system = mockSystemTheme(false);
    renderToggle();
    expect(currentTheme()).toBe('light');

    system.setDark(true);

    expect(currentTheme()).toBe('dark');
  });

  it('ignores operating system changes once a theme was chosen explicitly', async () => {
    const user = userEvent.setup();
    const system = mockSystemTheme(false);
    renderToggle();
    await user.click(option('Light'));

    system.setDark(true);

    expect(currentTheme()).toBe('light');
  });

  it('keeps working when browser storage is blocked', async () => {
    const user = userEvent.setup();
    mockSystemTheme(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderToggle();
    await user.click(option('Dark'));

    expect(currentTheme()).toBe('dark');
  });
});

describe('useTheme', () => {
  it('explains the mistake when used outside ThemeProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Probe() {
      useTheme();
      return null;
    }

    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
  });
});
