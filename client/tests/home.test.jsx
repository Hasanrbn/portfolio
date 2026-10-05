import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import siteConfig from '@portfolio/shared/siteConfig.json';
import App from '../src/app/App.jsx';
import ThemeProvider from '../src/app/ThemeProvider.jsx';
import Hero from '../src/components/sections/Hero.jsx';
import HighlightStrip from '../src/components/sections/HighlightStrip.jsx';
import { usePlaceholderProfile } from './helpers/profileConfig.js';

function renderHome() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const HERO_BASICS = { name: 'Ada Lovelace', role: 'Engineer', intro: 'Hello there.' };

function renderHero(props) {
  return render(
    <MemoryRouter>
      <Hero {...HERO_BASICS} {...props} />
    </MemoryRouter>,
  );
}

describe('home page', () => {
  usePlaceholderProfile();

  it('introduces the person with name, role and introduction', () => {
    renderHome();
    const main = screen.getByRole('main');

    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent(siteConfig.name);
    expect(main).toHaveTextContent(siteConfig.role);
    expect(main).toHaveTextContent(siteConfig.intro);
  });

  it('has exactly one h1 and no heading level skipped', () => {
    renderHome();
    const levels = within(screen.getByRole('main'))
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName[1]));

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, index) => {
      expect(level - levels[index]).toBeLessThanOrEqual(1);
    });
  });

  it('leads to the projects and contact pages', () => {
    renderHome();
    const main = screen.getByRole('main');

    expect(within(main).getByRole('link', { name: 'View My Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
    within(main)
      .getAllByRole('link', { name: 'Contact Me' })
      .forEach((link) => expect(link).toHaveAttribute('href', '/contact'));
  });

  it('leaves out the CV, picture, availability and profile links while they are placeholders', () => {
    renderHome();
    const main = screen.getByRole('main');

    expect(within(main).queryByRole('link', { name: /download cv/i })).toBeNull();
    expect(within(main).queryByRole('img')).toBeNull();
    expect(within(main).queryByRole('link', { name: /github|linkedin|email/i })).toBeNull();
    expect(within(main).queryByText(/available|open to/i)).toBeNull();
  });

  it('lists the core technologies from the config', () => {
    renderHome();
    const list = within(screen.getByRole('region', { name: 'Core technologies' })).getByRole(
      'list',
    );

    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(siteConfig.highlights);
  });
});

describe('Hero', () => {
  it('shows initials as a decorative monogram when there is no picture', () => {
    const { container } = renderHero();

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('AL');
  });

  it('shows the picture with a text alternative when one is set', () => {
    renderHero({ avatarSrc: '/me.jpg' });

    expect(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', '/me.jpg');
  });

  it('shows the availability status only when it is set', () => {
    const { unmount } = renderHero({ availability: 'Open to internships' });
    expect(screen.getByText('Open to internships')).toBeInTheDocument();
    unmount();

    renderHero({ availability: '' });
    expect(screen.queryByText('Open to internships')).toBeNull();
  });

  it('downloads a CV that is a file on this site', () => {
    renderHero({ resume: { href: '/cv.pdf', isExternal: false } });
    const link = screen.getByRole('link', { name: 'Download CV' });

    expect(link).toHaveAttribute('href', '/cv.pdf');
    expect(link).toHaveAttribute('download');
    expect(link).not.toHaveAttribute('target');
  });

  it('opens a CV on another site in a new tab, safely', () => {
    renderHero({ resume: { href: 'https://example.org/cv.pdf', isExternal: true } });
    const link = screen.getByRole('link', { name: 'Download CV (opens in a new tab)' });

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows profile links when given', () => {
    renderHero({
      socialLinks: [
        { id: 'github', label: 'GitHub', href: 'https://github.com/ada', icon: 'github' },
      ],
    });

    expect(screen.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute(
      'href',
      'https://github.com/ada',
    );
  });
});

describe('HighlightStrip', () => {
  it('renders nothing for an empty or blank list', () => {
    const { container, rerender } = render(<HighlightStrip technologies={[]} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<HighlightStrip technologies={['', '  ', 42]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
