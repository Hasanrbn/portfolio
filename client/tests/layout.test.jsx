import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import { usePlaceholderProfile } from './helpers/profileConfig.js';
import { renderSite } from './helpers/renderSite.jsx';
import { NAV_ITEMS, getNavItems } from '../src/app/siteNavigation.js';

const renderApp = renderSite;

/**
 * A stand-in for IntersectionObserver that lets a test say which sections are on screen.
 * `intersect(id)` reports that section as crossing the middle of the screen.
 */
function installFakeObserver() {
  const instances = [];
  class FakeObserver {
    constructor(callback) {
      this.callback = callback;
      this.elements = new Set();
      instances.push(this);
    }
    observe(element) {
      this.elements.add(element);
    }
    unobserve(element) {
      this.elements.delete(element);
    }
    disconnect() {
      this.elements.clear();
    }
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);

  return {
    intersect(id, isIntersecting = true) {
      const target = document.getElementById(id);
      act(() => {
        instances
          .filter((instance) => instance.elements.has(target))
          .forEach((instance) => instance.callback([{ target, isIntersecting }]));
      });
    },
  };
}

const mainNav = () => screen.getByRole('navigation', { name: 'Main' });
const navLink = (name) => within(mainNav()).getByRole('link', { name });
const menuButton = () => screen.getByRole('button', { name: 'Menu' });
const pageHeading = () => screen.getByRole('heading', { level: 1 });

/** The element the page was last scrolled to with scrollIntoView, if any. */
const lastScrolledTo = () => Element.prototype.scrollIntoView.mock.contexts.at(-1);

beforeEach(() => {
  window.scrollTo.mockClear();
  Element.prototype.scrollIntoView.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
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

describe('one page', () => {
  it('has a section behind every navigation item', () => {
    renderApp();

    for (const item of NAV_ITEMS) {
      expect(document.getElementById(item.id)).not.toBeNull();
      expect(item.to).toBe(`/#${item.id}`);
    }
  });

  it('has exactly one main landmark and one h1 for the whole site', () => {
    renderApp();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('has no /resume page: the CV is a download button, not a page', () => {
    renderApp('/resume');

    expect(pageHeading()).toHaveTextContent('404');
  });

  it.each([
    ['/about', 'about'],
    ['/skills', 'skills'],
    ['/projects', 'projects'],
    ['/experience', 'experience'],
    ['/education', 'education'],
    ['/certificates', 'certificates'],
    ['/contact', 'contact'],
    ['/projects/portfolio-website', 'project-portfolio-website'],
  ])('sends the old address %s to its section on the home page', async (path, id) => {
    renderApp(path);

    expect(pageHeading()).toHaveTextContent(siteConfig.name);
    // A project is only on the page once the projects have loaded, so the jump waits for it.
    await waitFor(() => expect(lastScrolledTo()).toBe(document.getElementById(id)));
    expect(document.getElementById(id)).not.toBeNull();
  });

  it('opens an address with a #section by scrolling to it and focusing its heading', () => {
    renderApp('/#education');
    const section = document.getElementById('education');

    expect(lastScrolledTo()).toBe(section);
    expect(within(section).getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('ignores a #section that does not exist', () => {
    renderApp('/#nothing-here');

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('main navigation', () => {
  it('marks no section until the page says which one is on screen', () => {
    renderApp();

    for (const item of NAV_ITEMS) {
      expect(navLink(item.label)).not.toHaveAttribute('aria-current');
    }
  });

  it('marks the section on screen and moves the mark as the visitor scrolls', () => {
    const observer = installFakeObserver();
    renderApp();

    observer.intersect('skills');
    expect(navLink('Skills')).toHaveAttribute('aria-current', 'location');
    expect(navLink('Home')).not.toHaveAttribute('aria-current');

    observer.intersect('skills', false);
    observer.intersect('projects');
    expect(navLink('Projects')).toHaveAttribute('aria-current', 'location');
    expect(navLink('Skills')).not.toHaveAttribute('aria-current');
  });

  it('marks nothing on a page that is not the home page', () => {
    installFakeObserver();
    renderApp('/no-such-page');

    for (const item of NAV_ITEMS) {
      expect(navLink(item.label)).not.toHaveAttribute('aria-current');
    }
  });

  it('scrolls to the section instead of changing page', async () => {
    const user = userEvent.setup();
    renderApp();

    for (const item of getNavItems()) {
      await user.click(navLink(item.label));

      expect(lastScrolledTo()).toBe(document.getElementById(item.id));
      expect(pageHeading()).toHaveTextContent(siteConfig.name);
    }
  });

  it('scrolls again when the same link is clicked twice', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(navLink('Skills'));
    await user.click(navLink('Skills'));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('scrolls smoothly, or at once when the visitor asked for reduced motion', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(navLink('About'));
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await user.click(navLink('Skills'));
    expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });
});

describe('moving around the page', () => {
  it('leaves focus and scroll alone on the first load of the plain address', () => {
    renderApp();

    expect(document.body).toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('moves focus to the heading of the section that was chosen', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(navLink('Projects'));

    expect(screen.getByRole('heading', { level: 2, name: 'Projects' })).toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top and focuses the heading when changing page', async () => {
    const user = userEvent.setup();
    renderApp('/no-such-page');
    window.scrollTo.mockClear();

    await user.click(screen.getByRole('link', { name: 'Back to Home' }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(pageHeading()).toHaveFocus();
  });

  describe('browser tab title', () => {
    afterEach(() => {
      // Unmount first so React can remove the <title> it added before this test removes the rest.
      cleanup();
      document.head.querySelectorAll('title').forEach((title) => title.remove());
    });

    it('is the same for the whole page, even when the HTML already contains a title', async () => {
      const user = userEvent.setup();
      document.head.innerHTML = '<title>Static title from index.html</title>';
      renderApp();
      expect(document.title).toBe(`${siteConfig.name} | ${siteConfig.role}`);

      await user.click(navLink('About'));

      expect(document.title).toBe(`${siteConfig.name} | ${siteConfig.role}`);
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

  it('closes after a section is chosen', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(menuButton());

    await user.click(navLink('About'));

    expect(lastScrolledTo()).toBe(document.getElementById('about'));
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

  it('shows the copyright, the sections and what the site is built with', () => {
    renderApp();
    const footer = screen.getByRole('contentinfo');

    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} ${siteConfig.name}`);
    expect(footer).toHaveTextContent('Built with React, Vite and Express.');
    expect(within(footer).getByRole('navigation', { name: 'Footer' })).toBeInTheDocument();
    expect(within(footer).queryByRole('link', { name: 'Resume' })).toBeNull();
  });

  it('does not show profile links that are still placeholders', () => {
    renderApp();
    const footer = screen.getByRole('contentinfo');

    expect(within(footer).queryByRole('link', { name: /github|linkedin|email/i })).toBeNull();
  });
});
