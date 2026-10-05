import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import { usePlaceholderProfile } from './helpers/profileConfig.js';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import { NAV_ITEMS } from '../src/app/siteNavigation.js';

function renderApp(path = '/') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const mainNav = () => screen.getByRole('navigation', { name: 'Main' });
const navLink = (name) => within(mainNav()).getByRole('link', { name });
const menuButton = () => screen.getByRole('button', { name: 'Menu' });
const pageHeading = () => screen.getByRole('heading', { level: 1 });

beforeEach(() => {
  window.scrollTo.mockClear();
});

describe('page frame', () => {
  it('has one banner, main and contentinfo landmark', () => {
    renderApp();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('puts the skip link first and sends focus to the main content', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.tab();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('shows the 404 page inside the same frame for unknown addresses', () => {
    renderApp('/no-such-page');

    expect(pageHeading()).toHaveTextContent('404');
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});

describe('main navigation', () => {
  it('marks only the current page', () => {
    renderApp('/skills');

    expect(navLink('Skills')).toHaveAttribute('aria-current', 'page');
    expect(navLink('Home')).not.toHaveAttribute('aria-current');
  });

  it('keeps a section active on its sub-pages', () => {
    renderApp('/projects/portfolio-website');

    expect(navLink('Projects')).toHaveAttribute('aria-current', 'page');
  });

  it('leads every link to a real page, never a 404', async () => {
    const user = userEvent.setup();
    renderApp();

    for (const item of NAV_ITEMS.filter((entry) => entry.to !== '/')) {
      await user.click(navLink(item.label));
      expect(pageHeading()).toHaveTextContent(item.label);
    }
  });
});

describe('moving between pages', () => {
  it('leaves focus alone on the first load', () => {
    renderApp();

    expect(document.body).toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top and focuses the new heading after navigating', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(navLink('Projects'));

    expect(pageHeading()).toHaveTextContent('Projects');
    expect(pageHeading()).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  describe('browser tab title', () => {
    afterEach(() => {
      // Unmount first so React can remove the <title> it added before this test removes the rest.
      cleanup();
      document.head.querySelectorAll('title').forEach((title) => title.remove());
    });

    it('follows the page, even when the HTML already contains a title', async () => {
      const user = userEvent.setup();
      document.head.innerHTML = '<title>Static title from index.html</title>';
      renderApp();
      expect(document.title).toBe(`${siteConfig.name} | ${siteConfig.role}`);

      await user.click(navLink('About'));

      expect(document.title).toBe(`About | ${siteConfig.name}`);
    });
  });
});

describe('menu on small screens', () => {
  it('opens and closes with the menu button', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');

    await user.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(menuButton());
    await user.tab();
    expect(navLink('Home')).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveFocus();
  });

  it('closes after a page is chosen', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(menuButton());

    await user.click(navLink('About'));

    expect(pageHeading()).toHaveTextContent('About');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when the page behind it is clicked', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(menuButton());

    await user.click(screen.getByRole('main'));

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when keyboard focus leaves the header', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(menuButton());

    act(() => screen.getByRole('main').focus());

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('footer', () => {
  usePlaceholderProfile();

  it('shows the copyright, the pages and what the site is built with', () => {
    renderApp();
    const footer = screen.getByRole('contentinfo');

    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} ${siteConfig.name}`);
    expect(footer).toHaveTextContent('Built with React, Vite and Express.');
    expect(within(footer).getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/resume');
  });

  it('does not show profile links that are still placeholders', () => {
    renderApp();
    const footer = screen.getByRole('contentinfo');

    expect(within(footer).queryByRole('link', { name: /github|linkedin|email/i })).toBeNull();
  });
});
